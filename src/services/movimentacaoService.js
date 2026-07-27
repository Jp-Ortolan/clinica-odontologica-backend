// Regras do registro de entradas e saídas de estoque.

const movimentacaoRepository = require('../repositories/movimentacaoRepository');
const materialRepository = require('../repositories/materialRepository');
const { validarMovimentacao } = require('../utils/validacoesEstoque');

function calcularDelta(tipo, quantidade) {
  return tipo === 'entrada' ? Number(quantidade) : -Number(quantidade);
}

async function listar(filtros) {
  return movimentacaoRepository.listar(filtros);
}

async function buscarPorId(id) {
  const movimentacao = await movimentacaoRepository.buscarPorId(id);
  if (!movimentacao) throw { status: 404, message: 'Movimentação não encontrada' };
  return movimentacao;
}

async function criar(dados, usuarioId) {
  const erros = validarMovimentacao(dados);
  if (erros.length) throw { status: 400, message: erros.join('; ') };

  const material = await materialRepository.buscarPorId(dados.material_id);
  if (!material) throw { status: 400, message: 'Material informado não existe' };

  const quantidade = Number(dados.quantidade);

  // O estoque nunca pode ficar negativo.
  if (dados.tipo === 'saida' && quantidade > material.quantidade) {
    throw {
      status: 409,
      message: `Estoque insuficiente: disponível ${material.quantidade}, solicitado ${quantidade}`,
    };
  }

  const movimentacao = await movimentacaoRepository.criar({
    material_id: dados.material_id,
    usuario_id: usuarioId,
    tipo: dados.tipo,
    quantidade,
    observacao: dados.observacao,
  });

  const delta = calcularDelta(dados.tipo, quantidade);
  await materialRepository.ajustarQuantidade(dados.material_id, delta);

  return movimentacao;
}

async function deletar(id) {
  const movimentacao = await movimentacaoRepository.buscarPorId(id);
  if (!movimentacao) throw { status: 404, message: 'Movimentação não encontrada' };

  const material = await materialRepository.buscarPorId(movimentacao.material_id);

  // Desfaz o efeito da movimentação no estoque ao removê-la.
  const deltaReverso = calcularDelta(
    movimentacao.tipo === 'entrada' ? 'saida' : 'entrada',
    movimentacao.quantidade
  );

  if (material.quantidade + deltaReverso < 0) {
    throw {
      status: 409,
      message: 'Não é possível remover esta movimentação: o estoque ficaria negativo',
    };
  }

  await materialRepository.ajustarQuantidade(movimentacao.material_id, deltaReverso);
  await movimentacaoRepository.deletar(id);

  return { message: 'Movimentação removida com sucesso' };
}

module.exports = { listar, buscarPorId, criar, deletar };
