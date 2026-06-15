const express = require('express');
const router = express.Router();
const esterilizacaoController = require('../controllers/esterilizacaoController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// GET /api/esterilizacoes → professor e aluno
router.get('/', auth, autorizar('professor', 'aluno'), esterilizacaoController.listar);

// GET /api/esterilizacoes/:id → professor e aluno
router.get('/:id', auth, autorizar('professor', 'aluno'), esterilizacaoController.buscarPorId);

// POST /api/esterilizacoes → professor e aluno (registra ciclo)
router.post('/', auth, autorizar('professor', 'aluno'), esterilizacaoController.criar);

// PUT /api/esterilizacoes/:id → professor e aluno
router.put('/:id', auth, autorizar('professor', 'aluno'), esterilizacaoController.atualizar);

// DELETE /api/esterilizacoes/:id → apenas professor
router.delete('/:id', auth, autorizar('professor'), esterilizacaoController.deletar);

module.exports = router;
