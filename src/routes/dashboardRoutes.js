const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// GET /api/dashboard/resumo → professor e aluno (recepcionista não tem dashboard clínico)
router.get('/resumo', auth, autorizar('professor', 'aluno'), dashboardController.obterResumo);

module.exports = router;
