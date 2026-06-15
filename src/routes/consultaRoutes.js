const express = require('express');
const router = express.Router();
const consultaController = require('../controllers/consultaController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// GET /api/consultas → professor, aluno e recepcionista
router.get('/', auth, autorizar('professor', 'aluno', 'recepcionista'), consultaController.listar);

// GET /api/consultas/:id → professor, aluno e recepcionista
router.get('/:id', auth, autorizar('professor', 'aluno', 'recepcionista'), consultaController.buscarPorId);

// POST /api/consultas → professor e aluno
router.post('/', auth, autorizar('professor', 'aluno'), consultaController.criar);

// PUT /api/consultas/:id → professor e aluno
router.put('/:id', auth, autorizar('professor', 'aluno'), consultaController.atualizar);

// DELETE /api/consultas/:id → apenas professor
router.delete('/:id', auth, autorizar('professor'), consultaController.deletar);

module.exports = router;
