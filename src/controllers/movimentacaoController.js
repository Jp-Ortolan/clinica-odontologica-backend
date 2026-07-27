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
  // Movimentações de estoque são imutáveis por design (não há rota PUT):
  // para corrigir um lançamento, remova-o (DELETE) e registre um novo.
  res.status(405).json({ message: 'Movimentações não podem ser editadas. Remova e registre uma nova.' });
}

async function deletar(req, res, next) {
  try {
    const resultado = await movimentacaoService.deletar(req.params.id);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };
