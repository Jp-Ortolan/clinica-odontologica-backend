// Regras do registro de entradas e saídas de estoque.

const movimentacaoRepository = require('../repositories/movimentacaoRepository');

// Regra de quem recebe cada aviso: utils/notificarEventos.js


async function listar(filtros) {
  return movimentacaoRepository.listar(filtros);
}

async function buscarPorId(id) {
  const movimentacao = await movimentacaoRepository.buscarPorId(id);
  if (!movimentacao) throw { status: 404, message: 'Movimentação não encontrada' };
  return movimentacao;
}

async function criar(dados, usuarioId) {
  return require('./rastreabilidadeService').movimentar(dados.material_id, dados, {id:usuarioId});
}

async function deletar(id) {
  await buscarPorId(id);
  throw { status: 409, message: 'Movimentações não podem ser apagadas. Registre uma entrada ou saída de correção para preservar os saldos dos lotes.' };
}

module.exports = { listar, buscarPorId, criar, deletar };
