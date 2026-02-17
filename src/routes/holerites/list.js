const express = require("express");
const { supabase } = require("../../config/db");

const router = express.Router();

/* =====================================================
   🔹 GET /holerites
===================================================== */
router.get("/", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("holerites")
            .select("*")
            .order("created_at", { ascending: false });

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
