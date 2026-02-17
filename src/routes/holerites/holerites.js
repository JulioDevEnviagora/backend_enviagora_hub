const express = require("express");
const router = express.Router();

// Importação das rotas separadas
const listRoutes = require("./list");
const uploadRoutes = require("./upload");
const downloadRoutes = require("./download");
const deleteRoutes = require("./delete");
const statsRoutes = require("./stats");
const updateRoutes = require("./update");

// Montagem das rotas
router.use("/", listRoutes);          // GET /
router.use("/upload", uploadRoutes); // POST /upload
router.use("/", downloadRoutes);      // GET /:id/download
router.use("/", deleteRoutes);        // DELETE /:id
router.use("/stats", statsRoutes);   // GET /stats/summary
router.use("/", updateRoutes);        // PUT /:id

module.exports = router;