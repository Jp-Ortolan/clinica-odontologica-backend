const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// GET /api/materiais → professor e aluno (recepcionista não acessa estoque)
router.get('/', auth, autorizar('professor', 'aluno'), materialController.listar);

// GET /api/materiais/:id → professor e aluno
router.get('/:id', auth, autorizar('professor', 'aluno'), materialController.buscarPorId);

// POST /api/materiais → professor e aluno
router.post('/', auth, autorizar('professor', 'aluno'), materialController.criar);

// PUT /api/materiais/:id → professor e aluno
router.put('/:id', auth, autorizar('professor', 'aluno'), materialController.atualizar);

// DELETE /api/materiais/:id → apenas professor
router.delete('/:id', auth, autorizar('professor'), materialController.deletar);

module.exports = router;
