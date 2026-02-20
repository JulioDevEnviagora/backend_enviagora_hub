const express = require("express");
const router = express.Router();

// Importar os handlers de horas extras
const horasExtrasHandler = require("./horas_extras");
const horasExtrasIndividuaisHandler = require("./horas_extras_individuais");
const horasExtrasAdminHandler = require("./horas_extras_admin");
const minhaMatriculaHandler = require("./minha_matricula");

// 🎯 ENDPOINTS DE CONTROLE DE PONTO

// 🔑 Endpoint para buscar matrícula do usuário logado
router.get("/minha-matricula", minhaMatriculaHandler);

// 🔍 Endpoint original - Busca horas extras de todos (com cache e otimização)
router.post("/horas-extras", horasExtrasHandler);

// ⚠️ IMPORTANTE: /admin deve vir ANTES de /:matricula para não ser capturado como parâmetro
// 📊 Endpoint administrativo - Painel completo com ranking
router.get("/horas-extras/admin", horasExtrasAdminHandler);

// 👤 Endpoint individual - Horas extras por matrícula (deve ficar por último)
router.get("/horas-extras/:matricula", horasExtrasIndividuaisHandler);

module.exports = router;
