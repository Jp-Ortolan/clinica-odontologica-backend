const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// GET /api/dashboard/resumo → professor e aluno (recepcionista não tem dashboard clínico)
router.get('/resumo', auth, autorizar('professor', 'aluno'), dashboardController.obterResumo);

// GET /api/dashboard/relatorio-pdf → mesmo indicadores do resumo, em PDF
router.get('/relatorio-pdf', auth, autorizar('professor', 'aluno'), dashboardController.gerarRelatorioPDF);

module.exports = router;
