const express = require('express');
const router = express.Router();
const permissaoController = require('../controllers/permissaoController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// GET /api/permissoes?perfil=aluno → apenas professor
router.get('/', auth, autorizar('professor'), permissaoController.listar);

module.exports = router;
