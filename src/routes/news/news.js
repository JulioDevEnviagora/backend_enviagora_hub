const express = require("express");
const multer = require("multer");
const { supabase } = require("../../config/db");
const authMiddleware = require("../../middlewares/authMiddleware");
const authorizeRoles = require("../../middlewares/authorizeRoles");
const { enviarNoticiaGeral } = require("../../utils/email");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 🔎 GET /api/news (Todos os usuários autenticados)
router.get("/", authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("news")
            .select("*")
            .order("ano_referencia", { ascending: false })
            .order("mes_referencia", { ascending: false });

        if (error) throw error;

        return res.json({ ok: true, data });
    } catch (err) {
        console.error("Erro ao listar news:", err);
        return res.status(500).json({ ok: false, message: "Erro ao buscar notícias." });
    }
});

// 🚀 POST /api/news (Apenas Admin)
router.post("/", authMiddleware, authorizeRoles('admin'), upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'capa', maxCount: 1 }
]), async (req, res) => {
    try {
        const { titulo, mes_referencia, ano_referencia, notificarEmail } = req.body;
        const files = req.files;

        if (!files.pdf) {
            return res.status(400).json({ ok: false, message: "O arquivo PDF é obrigatório." });
        }

        const pdfFile = files.pdf[0];
        let capaUrl = null;

        console.log(`[News] Iniciando publicação: ${titulo}`);

        // 1. Upload PDF
        const pdfPath = `news/${ano_referencia}/${Date.now()}_${pdfFile.originalname}`;
        const { error: pdfError } = await supabase.storage
            .from("news")
            .upload(pdfPath, pdfFile.buffer, { contentType: "application/pdf" });

        if (pdfError) throw pdfError;

        const { data: { publicUrl: pdfUrl } } = supabase.storage.from("news").getPublicUrl(pdfPath);

        // 2. Upload Capa (Opcional)
        if (files.capa && files.capa.length > 0) {
            const capaFile = files.capa[0];
            const capaPath = `news/${ano_referencia}/capas/${Date.now()}_${capaFile.originalname}`;
            const { error: capaError } = await supabase.storage
                .from("news")
                .upload(capaPath, capaFile.buffer, { contentType: capaFile.mimetype || 'image/jpeg' });

            if (capaError) throw capaError;

            const { data: { publicUrl: generatedCapaUrl } } = supabase.storage.from("news").getPublicUrl(capaPath);
            capaUrl = generatedCapaUrl;
        }

        // 4. Salvar no Banco
        const { error: dbError } = await supabase
            .from("news")
            .insert({
                titulo,
                mes_referencia: parseInt(mes_referencia),
                ano_referencia: parseInt(ano_referencia),
                pdf_url: pdfUrl,
                capa_url: capaUrl
            });

        if (dbError) throw dbError;

        // 📧 Notificação por Email
        if (notificarEmail === "true" || notificarEmail === true) {
            const { data: users } = await supabase
                .from("users")
                .select("email")
                .eq("role", "funcionario");

            if (users && users.length > 0) {
                const emailList = users.map(u => u.email);
                const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
                const monthName = monthNames[parseInt(mes_referencia) - 1];

                enviarNoticiaGeral(emailList, titulo, monthName, ano_referencia)
                    .catch(e => console.error("Erro email news:", e));
            }
        }

        return res.json({ ok: true, message: "Enviagora News publicado com sucesso!" });

    } catch (err) {
        console.error("Erro ao publicar news:", err);
        return res.status(500).json({ ok: false, message: "Erro interno ao publicar notícia." });
    }
});

// 🗑️ DELETE /api/news/:id (Apenas Admin)
router.delete("/:id", authMiddleware, authorizeRoles('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Buscar a news para saber os caminhos do storage
        const { data: news, error: fetchError } = await supabase
            .from("news")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !news) return res.status(404).json({ ok: false, message: "Notícia não encontrada." });

        // 2. Extrair caminhos do storage a partir da URL (se possível) ou apenas deletar do banco
        // Nota: Deletar do storage exige o caminho relativo, que não guardamos explicitamente. 
        // Por simplicidade, deletaremos apenas o registro do banco agora.

        const { error: delError } = await supabase
            .from("news")
            .delete()
            .eq("id", id);

        if (delError) throw delError;

        return res.json({ ok: true, message: "Notícia removida com sucesso." });
    } catch (err) {
        console.error("Erro ao deletar news:", err);
        return res.status(500).json({ ok: false, message: "Erro ao deletar notícia." });
    }
});

module.exports = router;
