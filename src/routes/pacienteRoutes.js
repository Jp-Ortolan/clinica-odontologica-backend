const express = require('express');
const router = express.Router();
const pacienteController = require('../controllers/pacienteController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// GET /api/pacientes → todos os perfis autenticados
router.get('/', auth, autorizar('professor', 'aluno', 'recepcionista'), pacienteController.listar);

// GET /api/pacientes/cep/:cep → busca endereço pelo CEP (ViaCEP)
router.get('/cep/:cep', auth, pacienteController.buscarCep);

// GET /api/pacientes/:id → todos os perfis autenticados
router.get('/:id', auth, autorizar('professor', 'aluno', 'recepcionista'), pacienteController.buscarPorId);

// POST /api/pacientes → professor e recepcionista
router.post('/', auth, autorizar('professor', 'recepcionista'), pacienteController.criar);

// PUT /api/pacientes/:id → professor e recepcionista
router.put('/:id', auth, autorizar('professor', 'recepcionista'), pacienteController.atualizar);

// DELETE /api/pacientes/:id → apenas professor
router.delete('/:id', auth, autorizar('professor'), pacienteController.deletar);

module.exports = router;
