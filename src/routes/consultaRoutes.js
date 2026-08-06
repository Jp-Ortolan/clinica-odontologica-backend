const express = require('express');
const router = express.Router();
const consultaController = require('../controllers/consultaController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// GET /api/consultas → professor, aluno e recepcionista
router.get('/', auth, autorizar('professor', 'aluno', 'recepcionista'), consultaController.listar);

// GET /api/consultas/:id → professor, aluno e recepcionista
router.get('/:id', auth, autorizar('professor', 'aluno', 'recepcionista'), consultaController.buscarPorId);

// POST /api/consultas → professor, aluno e recepcionista.
// A recepção é justamente quem agenda no balcão, então precisa criar
// consulta. Sem isso as telas "Agendar consulta", "Reagendar" e
// "Cancelar" da recepção respondiam 403 (Acesso negado).
router.post('/', auth, autorizar('professor', 'aluno', 'recepcionista'), consultaController.criar);

// PUT /api/consultas/:id → professor, aluno e recepcionista.
// Reagendamento e cancelamento (que muda o status) passam por aqui.
router.put('/:id', auth, autorizar('professor', 'aluno', 'recepcionista'), consultaController.atualizar);

// DELETE /api/consultas/:id → apenas professor
router.delete('/:id', auth, autorizar('professor'), consultaController.deletar);

// ── Materiais previstos (checklist persistido, espelha o de cirurgia) ──
// A tela "Detalhes do atendimento" do aluno usava uma lista fixa escrita
// no próprio frontend; agora esses materiais vêm do banco.

router.get('/:id/materiais', auth, autorizar('professor', 'aluno', 'recepcionista'), consultaController.listarMateriais);
router.post('/:id/materiais', auth, autorizar('professor', 'aluno'), consultaController.adicionarMaterial);
router.put('/:id/materiais/:materialVinculoId', auth, autorizar('professor', 'aluno'), consultaController.atualizarQuantidadeMaterial);
router.delete('/:id/materiais/:materialVinculoId', auth, autorizar('professor', 'aluno'), consultaController.removerMaterial);

module.exports = router;
