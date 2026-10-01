const express = require('express');
const router = express.Router();
const cirurgiaController = require('../controllers/cirurgiaController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// ── Mutirão cirúrgico (definido antes de "/:id" para não colidir) ──

router.get('/mutiroes', auth, autorizar('coordenador', 'professor', 'aluno', 'recepcionista'), cirurgiaController.listarMutiroes);
router.get('/mutiroes/:mutiraoId', auth, autorizar('coordenador', 'professor', 'aluno', 'recepcionista'), cirurgiaController.buscarMutiraoPorId);
router.get('/mutiroes/:mutiraoId/cirurgias', auth, autorizar('coordenador', 'professor', 'aluno', 'recepcionista'), cirurgiaController.listarCirurgiasDoMutirao);
router.post('/mutiroes', auth, autorizar('coordenador', 'professor'), cirurgiaController.criarMutirao);
router.put('/mutiroes/:mutiraoId', auth, autorizar('coordenador', 'professor'), cirurgiaController.atualizarMutirao);
router.delete('/mutiroes/:mutiraoId', auth, autorizar('coordenador', 'professor'), cirurgiaController.deletarMutirao);

// ── Cirurgia ─────────────────────────────────────────────────

// GET /api/cirurgias?status=&mutirao_id= → professor, aluno e recepcionista
router.get('/', auth, autorizar('coordenador', 'professor', 'aluno', 'recepcionista'), cirurgiaController.listar);

// GET /api/cirurgias/:id → professor, aluno e recepcionista
router.get('/:id', auth, autorizar('coordenador', 'professor', 'aluno', 'recepcionista'), cirurgiaController.buscarPorId);

// POST /api/cirurgias → professor e aluno
router.post('/', auth, autorizar('coordenador', 'professor', 'aluno'), cirurgiaController.criar);

// PUT /api/cirurgias/:id → professor e aluno
router.put('/:id', auth, autorizar('coordenador', 'professor', 'aluno'), cirurgiaController.atualizar);

// DELETE /api/cirurgias/:id → apenas professor
router.delete('/:id', auth, autorizar('coordenador', 'professor'), cirurgiaController.deletar);

// ── Compartilhamento de cursos ──────────────────────────────

router.get('/:id/alunos', auth, autorizar('coordenador', 'professor', 'aluno', 'recepcionista'), cirurgiaController.listarAlunosDaCirurgia);
router.post('/:id/alunos', auth, autorizar('coordenador', 'professor'), cirurgiaController.vincularAluno);
router.delete('/:id/alunos/:vinculoId', auth, autorizar('coordenador', 'professor'), cirurgiaController.desvincularAluno);

// ── Materiais previstos (checklist real, persistido no banco) ──

router.get('/:id/materiais', auth, autorizar('coordenador', 'professor', 'aluno', 'recepcionista'), cirurgiaController.listarMateriaisDaCirurgia);
router.post('/:id/materiais', auth, autorizar('coordenador', 'professor', 'aluno'), cirurgiaController.adicionarMaterial);
router.put('/:id/materiais/:materialVinculoId', auth, autorizar('coordenador', 'professor', 'aluno'), cirurgiaController.atualizarQuantidadeMaterial);
router.delete('/:id/materiais/:materialVinculoId', auth, autorizar('coordenador', 'professor', 'aluno'), cirurgiaController.removerMaterial);

module.exports = router;
