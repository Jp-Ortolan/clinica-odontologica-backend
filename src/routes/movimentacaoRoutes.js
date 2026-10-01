const express = require('express');
const router = express.Router();
const movimentacaoController = require('../controllers/movimentacaoController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// GET /api/movimentacoes → professor e aluno
router.get('/', auth, autorizar('coordenador', 'professor', 'aluno'), movimentacaoController.listar);

// GET /api/movimentacoes/:id → professor e aluno
router.get('/:id', auth, autorizar('coordenador', 'professor', 'aluno'), movimentacaoController.buscarPorId);

// POST /api/movimentacoes → professor e aluno (registra entrada/saída)
router.post('/', auth, autorizar('coordenador', 'professor', 'aluno'), movimentacaoController.criar);

// PUT /api/movimentacoes/:id → 405 por design (movimentações são imutáveis)
router.put('/:id', auth, autorizar('coordenador', 'professor', 'aluno'), movimentacaoController.atualizar);

// DELETE /api/movimentacoes/:id → apenas professor
router.delete('/:id', auth, autorizar('coordenador', 'professor'), movimentacaoController.deletar);

module.exports = router;
