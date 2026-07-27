const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/recuperar-senha → gera token de recuperação (tela "Recuperar senha")
router.post('/recuperar-senha', authController.solicitarRecuperacaoSenha);

// POST /api/auth/redefinir-senha → confirma o token e define a nova senha
router.post('/redefinir-senha', authController.redefinirSenha);

module.exports = router;
