const express = require('express');
const router = express.Router();
const pacienteController = require('../controllers/pacienteController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

const TODOS = ['professor', 'aluno', 'recepcionista'];
const PROF_RECEP = ['professor', 'recepcionista'];

// ── Paciente ─────────────────────────────────────────────────

// GET /api/pacientes?ativo=true|false → todos os perfis autenticados
router.get('/', auth, autorizar(...TODOS), pacienteController.listar);

// GET /api/pacientes/cep/:cep → busca endereço pelo CEP (ViaCEP)
router.get('/cep/:cep', auth, pacienteController.buscarCep);

// GET /api/pacientes/:id → todos os perfis autenticados
router.get('/:id', auth, autorizar(...TODOS), pacienteController.buscarPorId);

// POST /api/pacientes → professor e recepcionista
router.post('/', auth, autorizar(...PROF_RECEP), pacienteController.criar);

// PUT /api/pacientes/:id → professor e recepcionista
router.put('/:id', auth, autorizar(...PROF_RECEP), pacienteController.atualizar);

// PATCH /api/pacientes/:id/status → ativar/inativar (professor e recepcionista)
router.patch('/:id/status', auth, autorizar(...PROF_RECEP), pacienteController.atualizarStatusAtivo);

// DELETE /api/pacientes/:id → apenas professor
router.delete('/:id', auth, autorizar('professor'), pacienteController.deletar);

// ── Alergias ─────────────────────────────────────────────────

router.get('/:id/alergias', auth, autorizar(...TODOS), pacienteController.listarAlergias);
router.post('/:id/alergias', auth, autorizar(...PROF_RECEP, 'aluno'), pacienteController.criarAlergia);
router.delete('/:id/alergias/:alergiaId', auth, autorizar('professor', 'aluno'), pacienteController.deletarAlergia);

// ── Medicamentos ─────────────────────────────────────────────

router.get('/:id/medicamentos', auth, autorizar(...TODOS), pacienteController.listarMedicamentos);
router.post('/:id/medicamentos', auth, autorizar('professor', 'aluno'), pacienteController.criarMedicamento);
router.delete('/:id/medicamentos/:medicamentoId', auth, autorizar('professor', 'aluno'), pacienteController.deletarMedicamento);

// ── Documentos ───────────────────────────────────────────────

router.get('/:id/documentos', auth, autorizar(...TODOS), pacienteController.listarDocumentos);
router.post('/:id/documentos', auth, autorizar(...PROF_RECEP), pacienteController.criarDocumento);
router.get('/:id/documentos/:documentoId/download', auth, autorizar(...TODOS), pacienteController.baixarDocumento);
router.delete('/:id/documentos/:documentoId', auth, autorizar('professor'), pacienteController.deletarDocumento);

// ── Evolução do paciente ─────────────────────────────────────

router.get('/:id/evolucoes', auth, autorizar('professor', 'aluno'), pacienteController.listarEvolucoes);
router.post('/:id/evolucoes', auth, autorizar('professor', 'aluno'), pacienteController.criarEvolucao);

module.exports = router;
