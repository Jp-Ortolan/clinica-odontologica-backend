const express = require('express');
const router = express.Router();
const consultaController = require('../controllers/consultaController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// GET /api/consultas → professor, aluno e recepcionista
router.get('/', auth, autorizar('coordenador', 'professor', 'aluno', 'recepcionista'), consultaController.listar);

// GET /api/consultas/disciplinas → declarada ANTES de "/:id" para que
// "disciplinas" não seja capturado como um id.
router.get('/disciplinas', auth, consultaController.listarDisciplinas);

// GET /api/consultas/:id → professor, aluno e recepcionista
router.get('/:id', auth, autorizar('coordenador', 'professor', 'aluno', 'recepcionista'), consultaController.buscarPorId);

// POST /api/consultas → professor, aluno e recepcionista.
// A recepção é justamente quem agenda no balcão, então precisa criar
// consulta. Sem isso as telas "Agendar consulta", "Reagendar" e
// "Cancelar" da recepção respondiam 403 (Acesso negado).
router.post('/', auth, autorizar('coordenador', 'professor', 'aluno', 'recepcionista'), consultaController.criar);

// PUT /api/consultas/:id → professor, aluno e recepcionista.
// Reagendamento e cancelamento (que muda o status) passam por aqui.
router.put('/:id', auth, autorizar('coordenador', 'professor', 'aluno', 'recepcionista'), consultaController.atualizar);

// DELETE /api/consultas/:id → apenas professor
router.delete('/:id', auth, autorizar('coordenador', 'professor'), consultaController.deletar);

// ── Materiais previstos (checklist persistido, espelha o de cirurgia) ──
// A tela "Detalhes do atendimento" do aluno usava uma lista fixa escrita
// no próprio frontend; agora esses materiais vêm do banco.

router.get('/:id/materiais', auth, autorizar('coordenador', 'professor', 'aluno', 'recepcionista'), consultaController.listarMateriais);
router.post('/:id/materiais', auth, autorizar('coordenador', 'professor', 'aluno'), consultaController.adicionarMaterial);
router.put('/:id/materiais/:materialVinculoId', auth, autorizar('coordenador', 'professor', 'aluno'), consultaController.atualizarQuantidadeMaterial);
router.delete('/:id/materiais/:materialVinculoId', auth, autorizar('coordenador', 'professor', 'aluno'), consultaController.removerMaterial);

const equipe = require('../services/consultaEquipeService');
router.get('/:id/alunos', auth, autorizar('coordenador', 'professor', 'aluno', 'recepcionista'), async (req, res, next) => {
  try { res.json(await equipe.listar(req.params.id)); } catch (err) { next(err); }
});
router.put('/:id/alunos', auth, autorizar('coordenador', 'professor'), async (req, res, next) => {
  try { res.json(await equipe.atribuir(req.params.id, req.body.alunos_ids, req.user)); } catch (err) { next(err); }
});
module.exports = router;
