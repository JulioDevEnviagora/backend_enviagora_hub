const express = require("express");
const multer = require("multer");
const { supabase } = require("../../config/db");
const { extractEmployeeInfoFromPDF } = require("../../lib/pdfParser");
const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/authorizeRoles");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* =====================================================
   🔹 PUT /holerites/:id
===================================================== */
router.put("/:id", authMiddleware, authorizeRoles("admin"), upload.single("file"), async (req, res) => {
    try {
        const { id } = req.params;
        const { competencia } = req.body;
        const file = req.file;

        // 1. Buscar o registro atual e o código do usuário dono
        const { data: holerite, error: fetchError } = await supabase
            .from("holerites")
            .select("*, users:user_id ( codigo_holerite )")
            .eq("id", id)
            .single();

        if (fetchError || !holerite) {
            return res.status(404).json({ ok: false, message: "Holerite não encontrado." });
        }

        let updateData = {};
        if (competencia) updateData.competencia = competencia;

        // 2. Se um novo arquivo foi enviado, substituir no Storage
        if (file) {
            if (file.mimetype !== "application/pdf") {
                return res.status(400).json({ ok: false, message: "Apenas arquivos PDF são permitidos." });
            }

            // 🔒 Validar se é do mesmo funcionário
            const employeeInfo = await extractEmployeeInfoFromPDF(file.buffer);

            if (!employeeInfo || !employeeInfo.codigo) {
                return res.status(400).json({ ok: false, message: "Não foi possível identificar o código no PDF." });
            }

            const pdfCodigo = String(employeeInfo.codigo).trim();
            const userCodigo = (holerite.users && holerite.users.codigo_holerite != null)
                ? String(holerite.users.codigo_holerite).trim()
                : null;

            if (pdfCodigo !== userCodigo) {
                return res.status(400).json({
                    ok: false,
                    message: `Divergência de código! PDF: ${pdfCodigo} | Usuário: ${userCodigo}. O arquivo não pertence a este colaborador.`
                });
            }

            const fileName = `holerites/updated_${Date.now()}_${file.originalname}`;

            // Upload do novo arquivo
            const { error: uploadError } = await supabase.storage
                .from("holerites")
                .upload(fileName, file.buffer, {
                    contentType: "application/pdf",
                    upsert: false
                });

            if (uploadError) {
                return res.status(500).json({ ok: false, message: "Erro ao fazer upload do novo arquivo." });
            }

            // Remover arquivo antigo do Storage para não deixar lixo
            await supabase.storage
                .from("holerites")
                .remove([holerite.storage_path]);

            updateData.storage_path = fileName;
            updateData.original_filename = file.originalname;
        }

        // 3. Atualizar no banco de dados
        const { error: updateError } = await supabase
            .from("holerites")
            .update(updateData)
            .eq("id", id);

        if (updateError) {
            return res.status(500).json({ ok: false, message: "Erro ao atualizar registro no banco." });
        }

        res.json({ ok: true, message: "Holerite atualizado com sucesso." });

    } catch (err) {
        console.error("Erro UPDATE:", err);
        res.status(500).json({ ok: false, message: "Erro interno ao atualizar." });
    }
});

module.exports = router;