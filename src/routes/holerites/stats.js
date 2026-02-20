const express = require("express");
const { supabase } = require("../../config/db");
const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/authorizeRoles");

const router = express.Router();

/* =====================================================
   🔹 GET /holerites/stats/summary
===================================================== */
router.get("/summary", authMiddleware, authorizeRoles("admin"), async (req, res) => {
    try {
        const { count } = await supabase
            .from("holerites")
            .select("*", { count: "exact", head: true });

        res.json({
            ok: true,
            total: count || 0
        });

    } catch (err) {
        console.error("Erro stats:", err);
        res.status(500).json({ ok: false });
    }
});

module.exports = router;