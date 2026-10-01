const express = require('express');
const router = express.Router();
const c  = require('../controllers/esterilizacaoController');
const cb = require('../controllers/controleBiologicoController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// ── Ciclos ───────────────────────────────────────────────────
router.get('/',    auth, autorizar('coordenador', 'professor', 'aluno'), c.listar);
router.get('/:id', auth, autorizar('coordenador', 'professor', 'aluno'), c.buscarPorId);
router.post('/',   auth, autorizar('coordenador', 'professor', 'aluno'), c.criar);
router.put('/:id', auth, autorizar('coordenador', 'professor', 'aluno'), c.atualizar);
router.delete('/:id', auth, autorizar('coordenador', 'professor'), c.deletar);

// ── Pacotes do ciclo ─────────────────────────────────────────
router.get('/:id/pacotes',  auth, autorizar('coordenador', 'professor', 'aluno'), c.listarPacotes);
router.post('/:id/pacotes', auth, autorizar('coordenador', 'professor', 'aluno'), c.criarPacote);

// GET /esterilizacoes/pacotes/:pacoteId → busca um pacote isolado, sem
// precisar saber o ciclo. Usado pelo leitor de QR-code do CME.
router.get('/pacotes/:pacoteId', auth, autorizar('coordenador', 'professor', 'aluno'), c.buscarPacotePorId);

// ── QR Code e status do pacote ───────────────────────────────
router.get('/pacotes/:pacoteId/qrcode',      auth, autorizar('coordenador', 'professor', 'aluno'), c.obterQRCode);
router.patch('/pacotes/:pacoteId/status',    auth, autorizar('coordenador', 'professor', 'aluno'), c.atualizarStatusPacote);

// ── Controle biológico do ciclo ──────────────────────────────
router.get('/:id/controles',                  auth, autorizar('coordenador', 'professor', 'aluno'), cb.listarPorCiclo);
router.post('/:id/controles',                 auth, autorizar('coordenador', 'professor', 'aluno'), cb.criar);
router.get('/:id/controles/:controleId',      auth, autorizar('coordenador', 'professor', 'aluno'), cb.buscarPorId);
router.put('/:id/controles/:controleId',      auth, autorizar('coordenador', 'professor', 'aluno'), cb.atualizar);
router.delete('/:id/controles/:controleId',   auth, autorizar('coordenador', 'professor'),          cb.deletar);

module.exports = router;
