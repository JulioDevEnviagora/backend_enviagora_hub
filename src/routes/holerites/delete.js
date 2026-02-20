const express = require("express");
const { supabase } = require("../../config/db");
const authMiddleware = require("../../middlewares/authMiddleware");
const { authorizeRoles } = require("../../middlewares/authorizeRoles");

const router = express.Router();

/* =====================================================
   🔹 DELETE /holerites/:id
===================================================== */
router.delete("/:id", authMiddleware, authorizeRoles("admin"), async (req, res) => {
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

        await supabase.storage
            .from("holerites")
            .remove([holerite.storage_path]);

        await supabase
            .from("holerites")
            .delete()
            .eq("id", id);

        res.json({ ok: true, message: "Excluído com sucesso." });

    } catch (err) {
        console.error("Erro DELETE:", err);
        res.status(500).json({ ok: false });
    }
});

module.exports = router;