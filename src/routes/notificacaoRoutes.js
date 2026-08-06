const express = require('express');
const router = express.Router();
const notificacaoController = require('../controllers/notificacaoController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// As notificações são sempre do usuário logado, então basta estar
// autenticado — não há filtro por perfil na leitura. Os três perfis
// (professor, aluno, recepcionista) têm o sino na interface.

// GET /api/notificacoes?naoLidas=true&limite=50
router.get('/', auth, notificacaoController.listar);

// GET /api/notificacoes/nao-lidas → { total: N } para o badge do sino.
// Declarada antes de "/:id" não é necessário aqui (não existe GET /:id),
// mas fica antes por clareza.
router.get('/nao-lidas', auth, notificacaoController.contarNaoLidas);

// PATCH /api/notificacoes/marcar-todas-lidas → precisa vir ANTES de
// "/:id/lida" não colidir; como os caminhos são distintos não há conflito,
// mas mantemos a ordem explícita.
router.patch('/marcar-todas-lidas', auth, notificacaoController.marcarTodasComoLidas);

// PATCH /api/notificacoes/:id/lida
router.patch('/:id/lida', auth, notificacaoController.marcarComoLida);

// DELETE /api/notificacoes/:id
router.delete('/:id', auth, notificacaoController.deletar);

// POST /api/notificacoes → apenas professor pode disparar notificação
// manualmente (avisos para a turma, por exemplo). As notificações
// automáticas são criadas pelos próprios services, sem passar por HTTP.
router.post('/', auth, autorizar('professor'), notificacaoController.criar);

module.exports = router;
