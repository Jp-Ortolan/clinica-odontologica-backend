const movimentacaoService = require('../services/movimentacaoService');

async function listar(req, res, next) {
  try {
    const { material_id, tipo } = req.query;
    const movimentacoes = await movimentacaoService.listar({ material_id, tipo });
    res.status(200).json(movimentacoes);
  } catch (err) {
    next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const movimentacao = await movimentacaoService.buscarPorId(req.params.id);
    res.status(200).json(movimentacao);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const movimentacao = await movimentacaoService.criar(req.body, req.user.id);
    res.status(201).json(movimentacao);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res) {
  // Movimentações de estoque são imutáveis (histórico de auditoria): para
  // corrigir um lançamento, registre a movimentação inversa.
  res.status(405).json({ message: 'Movimentações não podem ser editadas nem removidas. Registre uma movimentação inversa para corrigir.' });
}


module.exports = { listar, buscarPorId, criar, atualizar };
