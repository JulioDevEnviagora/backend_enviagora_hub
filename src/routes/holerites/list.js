const authMiddleware = require("../../middlewares/authMiddleware");

const router = express.Router();

/* =====================================================
   🔹 GET /holerites
===================================================== */
router.get("/", authMiddleware, async (req, res) => {
    try {
        let query = supabase
            .from("holerites")
            .select("*");

        // 🛡️ Segurança: Se não for admin, filtra pelo ID do próprio usuário
        if (req.user.role !== 'admin') {
            query = query.eq("user_id", req.user.id);
        }

        const { data, error } = await query.order("created_at", { ascending: false });

        if (error) {
            return res.status(500).json({
                ok: false,
                error: error.message
            });
        }

        return res.json({ ok: true, data });

    } catch (err) {
        console.error("Erro GET:", err);
        return res.status(500).json({ ok: false });
    }
});

module.exports = router;
