const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/recuperar-senha → gera token de recuperação (tela "Recuperar senha")
router.post('/recuperar-senha', authController.solicitarRecuperacaoSenha);

// POST /api/auth/redefinir-senha → confirma o token e define a nova senha
router.post('/redefinir-senha', authController.redefinirSenha);

// GET /api/auth/me → dados do usuário logado, a partir do token.
// Usado pelo front pra validar a sessão ao carregar a página (em vez de
// confiar cegamente no que está salvo no localStorage).
router.get('/me', auth, authController.me);

module.exports = router;
