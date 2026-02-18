const authMiddleware = require("../../middlewares/authMiddleware");

const router = express.Router();

/* =====================================================
   🔹 GET /holerites/:id/download
===================================================== */
router.get("/:id/download", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Buscar o holerite para verificar a quem pertence
        const { data: holerite } = await supabase
            .from("holerites")
            .select("*")
            .eq("id", id)
            .single();

        if (!holerite) {
            return res.status(404).json({ ok: false, message: "Holerite não encontrado." });
        }

        // 🛡️ Segurança: Somente o dono ou admin pode baixar
        if (req.user.role !== 'admin' && holerite.user_id !== req.user.id) {
            return res.status(403).json({ ok: false, message: "Você não tem permissão para baixar este arquivo." });
        }

        const { data: fileData, error: downloadError } = await supabase.storage
            .from("holerites")
            .download(holerite.storage_path);

        if (downloadError) throw downloadError;

        const buffer = Buffer.from(await fileData.arrayBuffer());

        res.setHeader("Content-Type", "application/pdf");
        res.send(buffer);

    } catch (err) {
        console.error("Erro download:", err);
        res.status(500).json({ ok: false });
    }
});

module.exports = router;
