const express = require('express');
const router = express.Router();
const movimentacaoController = require('../controllers/movimentacaoController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// GET /api/movimentacoes → professor e aluno
router.get('/', auth, autorizar('professor', 'aluno'), movimentacaoController.listar);

// GET /api/movimentacoes/:id → professor e aluno
router.get('/:id', auth, autorizar('professor', 'aluno'), movimentacaoController.buscarPorId);

// POST /api/movimentacoes → professor e aluno (registra entrada/saída)
router.post('/', auth, autorizar('professor', 'aluno'), movimentacaoController.criar);

// DELETE /api/movimentacoes/:id → apenas professor
router.delete('/:id', auth, autorizar('professor'), movimentacaoController.deletar);

module.exports = router;
