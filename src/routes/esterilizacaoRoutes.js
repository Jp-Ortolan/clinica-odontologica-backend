const express = require('express');
const router = express.Router();
const c  = require('../controllers/esterilizacaoController');
const cb = require('../controllers/controleBiologicoController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// ── Ciclos ───────────────────────────────────────────────────
router.get('/',    auth, autorizar('professor', 'aluno'), c.listar);
router.get('/:id', auth, autorizar('professor', 'aluno'), c.buscarPorId);
router.post('/',   auth, autorizar('professor', 'aluno'), c.criar);
router.put('/:id', auth, autorizar('professor', 'aluno'), c.atualizar);
router.delete('/:id', auth, autorizar('professor'), c.deletar);

// ── Pacotes do ciclo ─────────────────────────────────────────
router.get('/:id/pacotes',  auth, autorizar('professor', 'aluno'), c.listarPacotes);
router.post('/:id/pacotes', auth, autorizar('professor', 'aluno'), c.criarPacote);

// ── QR Code e status do pacote ───────────────────────────────
router.get('/pacotes/:pacoteId/qrcode',      auth, autorizar('professor', 'aluno'), c.obterQRCode);
router.patch('/pacotes/:pacoteId/status',    auth, autorizar('professor', 'aluno'), c.atualizarStatusPacote);

// ── Controle biológico do ciclo ──────────────────────────────
router.get('/:id/controles',                  auth, autorizar('professor', 'aluno'), cb.listarPorCiclo);
router.post('/:id/controles',                 auth, autorizar('professor', 'aluno'), cb.criar);
router.get('/:id/controles/:controleId',      auth, autorizar('professor', 'aluno'), cb.buscarPorId);
router.put('/:id/controles/:controleId',      auth, autorizar('professor', 'aluno'), cb.atualizar);
router.delete('/:id/controles/:controleId',   auth, autorizar('professor'),          cb.deletar);

module.exports = router;
