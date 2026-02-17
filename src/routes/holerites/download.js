const express = require("express");
const { supabase } = require("../../config/db");

const router = express.Router();

/* =====================================================
   🔹 GET /holerites/:id/download
===================================================== */
router.get("/:id/download", async (req, res) => {
    try {
        const { id } = req.params;

        const { data: holerite } = await supabase
            .from("holerites")
            .select("*")
            .eq("id", id)
            .single();

        if (!holerite) {
            return res.status(404).json({ ok: false });
        }

        const { data: fileData } = await supabase.storage
            .from("holerites")
            .download(holerite.storage_path);

        const buffer = Buffer.from(await fileData.arrayBuffer());

        res.setHeader("Content-Type", "application/pdf");
        res.send(buffer);

    } catch (err) {
        console.error("Erro download:", err);
        res.status(500).json({ ok: false });
    }
});

module.exports = router;
