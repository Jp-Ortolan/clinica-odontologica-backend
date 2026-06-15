const express = require('express');
const router = express.Router();
const cirurgiaController = require('../controllers/cirurgiaController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// GET /api/cirurgias → professor, aluno e recepcionista
router.get('/', auth, autorizar('professor', 'aluno', 'recepcionista'), cirurgiaController.listar);

// GET /api/cirurgias/:id → professor, aluno e recepcionista
router.get('/:id', auth, autorizar('professor', 'aluno', 'recepcionista'), cirurgiaController.buscarPorId);

// POST /api/cirurgias → professor e aluno
router.post('/', auth, autorizar('professor', 'aluno'), cirurgiaController.criar);

// PUT /api/cirurgias/:id → professor e aluno
router.put('/:id', auth, autorizar('professor', 'aluno'), cirurgiaController.atualizar);

// DELETE /api/cirurgias/:id → apenas professor
router.delete('/:id', auth, autorizar('professor'), cirurgiaController.deletar);

module.exports = router;
