const express = require('express');
const router = express.Router();
const cirurgiaController = require('../controllers/cirurgiaController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// ── Mutirão cirúrgico (definido antes de "/:id" para não colidir) ──

router.get('/mutiroes', auth, autorizar('professor', 'aluno', 'recepcionista'), cirurgiaController.listarMutiroes);
router.get('/mutiroes/:mutiraoId', auth, autorizar('professor', 'aluno', 'recepcionista'), cirurgiaController.buscarMutiraoPorId);
router.get('/mutiroes/:mutiraoId/cirurgias', auth, autorizar('professor', 'aluno', 'recepcionista'), cirurgiaController.listarCirurgiasDoMutirao);
router.post('/mutiroes', auth, autorizar('professor'), cirurgiaController.criarMutirao);
router.put('/mutiroes/:mutiraoId', auth, autorizar('professor'), cirurgiaController.atualizarMutirao);
router.delete('/mutiroes/:mutiraoId', auth, autorizar('professor'), cirurgiaController.deletarMutirao);

// ── Cirurgia ─────────────────────────────────────────────────

// GET /api/cirurgias?status=&mutirao_id= → professor, aluno e recepcionista
router.get('/', auth, autorizar('professor', 'aluno', 'recepcionista'), cirurgiaController.listar);

// GET /api/cirurgias/:id → professor, aluno e recepcionista
router.get('/:id', auth, autorizar('professor', 'aluno', 'recepcionista'), cirurgiaController.buscarPorId);

// POST /api/cirurgias → professor e aluno
router.post('/', auth, autorizar('professor', 'aluno'), cirurgiaController.criar);

// PUT /api/cirurgias/:id → professor e aluno
router.put('/:id', auth, autorizar('professor', 'aluno'), cirurgiaController.atualizar);

// DELETE /api/cirurgias/:id → apenas professor
router.delete('/:id', auth, autorizar('professor'), cirurgiaController.deletar);

// ── Compartilhamento de cursos ──────────────────────────────

router.get('/:id/alunos', auth, autorizar('professor', 'aluno', 'recepcionista'), cirurgiaController.listarAlunosDaCirurgia);
router.post('/:id/alunos', auth, autorizar('professor'), cirurgiaController.vincularAluno);
router.delete('/:id/alunos/:vinculoId', auth, autorizar('professor'), cirurgiaController.desvincularAluno);

module.exports = router;
