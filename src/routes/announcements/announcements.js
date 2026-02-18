const express = require("express");
const { supabase } = require("../../config/db");
const authMiddleware = require("../../middlewares/authMiddleware");
const authorizeRoles = require("../../middlewares/authorizeRoles");

const router = express.Router();

// 🔎 GET /api/announcements (Todos os usuários autenticados)
router.get("/", authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("announcements")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        return res.json({ ok: true, data });
    } catch (err) {
        console.error("Erro ao listar avisos:", err);
        return res.status(500).json({ ok: false, message: "Erro ao buscar avisos." });
    }
});

// 🚀 POST /api/announcements (Apenas Admin)
router.post("/", authMiddleware, authorizeRoles('admin'), async (req, res) => {
    try {
        const { titulo, conteudo, tipo } = req.body;

        if (!titulo || !conteudo) {
            return res.status(400).json({ ok: false, message: "Título e conteúdo são obrigatórios." });
        }

        const { data, error } = await supabase
            .from("announcements")
            .insert({
                titulo,
                conteudo,
                tipo: tipo || 'informativo',
                admin_id: req.user.id
            })
            .select();

        if (error) throw error;

        return res.json({ ok: true, message: "Aviso publicado com sucesso!", data: data[0] });

    } catch (err) {
        console.error("Erro ao publicar aviso:", err);
        return res.status(500).json({ ok: false, message: "Erro interno ao publicar aviso." });
    }
});

// 🔄 PUT /api/announcements/:id (Apenas Admin)
router.put("/:id", authMiddleware, authorizeRoles('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, conteudo, tipo } = req.body;

        if (!titulo || !conteudo) {
            return res.status(400).json({ ok: false, message: "Título e conteúdo são obrigatórios." });
        }

        const { data, error } = await supabase
            .from("announcements")
            .update({
                titulo,
                conteudo,
                tipo: tipo || 'informativo'
            })
            .eq("id", id)
            .select();

        if (error) throw error;

        return res.json({ ok: true, message: "Aviso atualizado com sucesso!", data: data[0] });

    } catch (err) {
        console.error("Erro ao atualizar aviso:", err);
        return res.status(500).json({ ok: false, message: "Erro interno ao atualizar aviso." });
    }
});

// 🗑️ DELETE /api/announcements/:id (Apenas Admin)
router.delete("/:id", authMiddleware, authorizeRoles('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from("announcements")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return res.json({ ok: true, message: "Aviso removido com sucesso." });
    } catch (err) {
        console.error("Erro ao deletar aviso:", err);
        return res.status(500).json({ ok: false, message: "Erro ao deletar aviso." });
    }
});

module.exports = router;
