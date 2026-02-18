const express = require("express");
const multer = require("multer");
const { supabase } = require("../../config/db");
const { extractEmployeeInfoFromPDF } = require("../../lib/pdfParser");
const authMiddleware = require("../../middlewares/authMiddleware");
const authorizeRoles = require("../../middlewares/authorizeRoles");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* =====================================================
   🔹 POST /holerites/upload
===================================================== */
router.post("/", authMiddleware, authorizeRoles('admin'), upload.array("files"), async (req, res) => {
    const start = Date.now();
    try {
        const { competencia } = req.body;
        const files = req.files;

        console.log(`[Upload] Iniciando processamento de ${files?.length || 0} arquivos para competência ${competencia}`);

        if (!files || files.length === 0) {
            return res.status(400).json({
                ok: false,
                message: "Nenhum arquivo enviado."
            });
        }

        if (!competencia) {
            return res.status(400).json({
                ok: false,
                message: "Competência é obrigatória."
            });
        }

        let results = [];

        for (const file of files) {
            try {
                if (file.mimetype !== "application/pdf") {
                    results.push({
                        file: file.originalname,
                        ok: false,
                        message: "Apenas arquivos PDF são permitidos."
                    });
                    continue;
                }

                const memoryUsage = process.memoryUsage().rss / 1024 / 1024;
                console.log(`[Upload] Processando: ${file.originalname} | Memória: ${memoryUsage.toFixed(2)}MB`);

                // 🔍 Extrair nome e código do PDF
                const employeeInfo = await extractEmployeeInfoFromPDF(file.buffer);
                const textoExtraido = employeeInfo?.fullText || null;

                // Removido console.log do employeeInfo para evitar travamentos com textos grandes

                if (!employeeInfo || !employeeInfo.codigo) {
                    results.push({
                        file: file.originalname,
                        ok: false,
                        codigoExtraido: null,
                        textoExtraido,
                        message: "Código do funcionário não encontrado no PDF."
                    });
                    continue;
                }

                const codigo = employeeInfo.codigo.trim();

                // 🔎 Buscar usuário pelo código do holerite
                const { data: user, error: userError } = await supabase
                    .from("users")
                    .select("*")
                    .eq("codigo_holerite", codigo)
                    .single();

                if (userError || !user) {
                    results.push({
                        file: file.originalname,
                        ok: false,
                        codigoExtraido: codigo,
                        textoExtraido,
                        message: "Nenhum funcionário encontrado com esse código."
                    });
                    continue;
                }

                // 🔐 Verificar duplicidade (mesmo user + mesma competência)
                const { data: existing } = await supabase
                    .from("holerites")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("competencia", competencia)
                    .maybeSingle();

                if (existing) {
                    results.push({
                        file: file.originalname,
                        ok: false,
                        codigoExtraido: codigo,
                        textoExtraido,
                        message: "Já existe holerite cadastrado para esse funcionário nessa competência."
                    });
                    continue;
                }

                // 📂 Gerar nome do arquivo
                const fileName = `holerites/${codigo}_${competencia}_${Date.now()}.pdf`;

                // 📦 Upload no Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from("holerites")
                    .upload(fileName, file.buffer, {
                        contentType: "application/pdf",
                        upsert: false
                    });

                if (uploadError) {
                    console.error("Erro upload:", uploadError);
                    results.push({
                        file: file.originalname,
                        ok: false,
                        codigoExtraido: codigo,
                        textoExtraido,
                        message: "Erro ao fazer upload no storage."
                    });
                    continue;
                }

                // 📝 Inserir registro na tabela
                const { error: insertError } = await supabase
                    .from("holerites")
                    .insert({
                        user_id: user.id,
                        cpf: user.cpf,
                        competencia,
                        storage_path: fileName,
                        original_filename: file.originalname
                    });

                if (insertError) {
                    console.error("Erro insert:", insertError);
                    results.push({
                        file: file.originalname,
                        ok: false,
                        codigoExtraido: codigo,
                        textoExtraido,
                        message: "Erro ao salvar no banco."
                    });
                    continue;
                }

                results.push({
                    file: file.originalname,
                    ok: true,
                    codigoExtraido: codigo,
                    textoExtraido,
                    message: `Holerite cadastrado com sucesso para ${user.nome}.`
                });

            } catch (fileError) {
                console.error("Erro no arquivo:", file.originalname, fileError);
                results.push({
                    file: file.originalname,
                    ok: false,
                    textoExtraido: null,
                    message: "Erro inesperado ao processar arquivo."
                });
            }
        }

        const duration = ((Date.now() - start) / 1000).toFixed(2);
        console.log(`[Upload] Finalizado em ${duration}s`);
        return res.json({ ok: true, results });

    } catch (err) {
        console.error("Erro geral upload:", err);
        return res.status(500).json({
            ok: false,
            message: "Erro interno do servidor."
        });
    }
});

module.exports = router;
