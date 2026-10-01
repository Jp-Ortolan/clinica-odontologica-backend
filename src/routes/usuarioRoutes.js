const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// Todas as rotas abaixo exigem autenticação (auth)
// Algumas exigem também um perfil específico (autorizar)

// GET /api/usuarios → apenas admin e recepcionista
router.get('/profissionais', auth, autorizar('coordenador', 'professor', 'aluno', 'recepcionista'), usuarioController.listarProfissionais);

router.get('/', auth, autorizar('coordenador'), usuarioController.listar);

// GET /api/usuarios/:id → professor e recepcionista
router.get('/:id', auth, autorizar('coordenador'), usuarioController.buscarPorId);

// POST /api/usuarios → apenas admin
router.post('/', auth, autorizar('coordenador'), usuarioController.criar);

// PUT /api/usuarios/:id → apenas admin
router.put('/:id', auth, autorizar('coordenador'), usuarioController.atualizar);

// DELETE /api/usuarios/:id → apenas admin
router.delete('/:id', auth, autorizar('coordenador'), usuarioController.deletar);

module.exports = router;
