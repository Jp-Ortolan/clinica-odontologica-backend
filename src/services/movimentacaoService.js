// Regras do registro de entradas e saídas de estoque.

const movimentacaoRepository = require('../repositories/movimentacaoRepository');
const rastreabilidadeService = require('./rastreabilidadeService');

async function listar(filtros) {
  return movimentacaoRepository.listar(filtros);
}

async function buscarPorId(id) {
  const movimentacao = await movimentacaoRepository.buscarPorId(id);
  if (!movimentacao) throw { status: 404, message: 'Movimentação não encontrada' };
  return movimentacao;
}

// Entrada/saída de estoque: sempre por lote, numa transação (ver
// rastreabilidadeService.movimentar). Movimentações são imutáveis: para
// corrigir um lançamento, registre a movimentação inversa.
async function criar(dados, usuarioId) {
  return rastreabilidadeService.movimentar(dados.material_id, dados, { id: usuarioId });
}

module.exports = { listar, buscarPorId, criar };
