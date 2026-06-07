const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// Todas as rotas abaixo exigem autenticação (auth)
// Algumas exigem também um perfil específico (autorizar)

// GET /api/usuarios → apenas admin e recepcionista
router.get('/', auth, autorizar('professor', 'recepcionista'), usuarioController.listar);

// GET /api/usuarios/:id → admin, dentista e recepcionista
router.get('/:id', auth, autorizar('professor', 'dentista', 'recepcionista'), usuarioController.buscarPorId);

// POST /api/usuarios → apenas admin
router.post('/', auth, autorizar('professor'), usuarioController.criar);

// PUT /api/usuarios/:id → apenas admin
router.put('/:id', auth, autorizar('professor'), usuarioController.atualizar);

// DELETE /api/usuarios/:id → apenas admin
router.delete('/:id', auth, autorizar('professor'), usuarioController.deletar);

module.exports = router;
