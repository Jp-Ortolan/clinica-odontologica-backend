const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// GET /api/logs?nivel=info|warn|error&limite=100 → apenas professor
// (telas "Logs" e "Auditoria" do painel administrativo do protótipo)
router.get('/', auth, autorizar('professor'), logController.listarAuditoria);

module.exports = router;
