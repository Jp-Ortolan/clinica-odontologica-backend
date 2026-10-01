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

// PUT e DELETE /api/movimentacoes/:id → 405 por design (histórico imutável)
router.put('/:id', auth, autorizar('professor', 'aluno'), movimentacaoController.atualizar);
router.delete('/:id', auth, autorizar('professor', 'aluno'), movimentacaoController.atualizar);

module.exports = router;
