const express = require('express');
const router = express.Router();

const listarColaboradores = require('./listarColaboradores');
const buscarColaboradorPorId = require('./buscarColaboradorPorId');
const criarColaborador = require('./criarColaborador');
const editarColaborador = require('./editarColaborador');
const deletarColaborador = require('./deletarColaborador');
const alterarSenhaColaborador = require('./alterarSenhaColaborador');
const enviarSenhaProvisoria = require('./enviarSenhaProvisoria');

router.get('/', listarColaboradores);
router.get('/:id', buscarColaboradorPorId);
router.post('/', criarColaborador);
router.put('/:id', editarColaborador);
router.delete('/:id', deletarColaborador);
router.post('/:id/password', alterarSenhaColaborador);
router.post('/:id/resend-password', enviarSenhaProvisoria);

module.exports = router;