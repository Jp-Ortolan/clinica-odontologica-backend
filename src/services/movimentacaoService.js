// Regras do registro de entradas e saídas de estoque.

const movimentacaoRepository = require('../repositories/movimentacaoRepository');
const materialRepository = require('../repositories/materialRepository');
const { validarMovimentacao } = require('../utils/validacoesEstoque');
// Regra de quem recebe cada aviso: utils/notificarEventos.js
const eventos = require('../utils/notificarEventos');
const transacao = require('../utils/transacao');

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

// Entrada/saída de estoque. Tudo dentro de uma transação: o registro no
// histórico e o ajuste do saldo acontecem juntos ou não acontecem. A linha
// do material fica travada (FOR UPDATE) para que duas saídas simultâneas
// não passem do saldo disponível.
//
// Movimentações são imutáveis: não há edição nem exclusão. Para corrigir
// um lançamento, registre a movimentação inversa (com observação).
async function criar(dados, usuarioId) {
  const erros = validarMovimentacao(dados);
  if (erros.length) throw { status: 400, message: erros.join('; ') };

  const quantidade = Number(dados.quantidade);
  const delta = calcularDelta(dados.tipo, quantidade);

  const { movimentacao, antes, depois } = await transacao(async (db) => {
    const material = await materialRepository.buscarParaMovimentacao(dados.material_id, db);
    if (!material) throw { status: 400, message: 'Material informado não existe' };

    if (dados.tipo === 'saida' && quantidade > material.quantidade) {
      throw {
        status: 409,
        message: `Estoque insuficiente: disponível ${material.quantidade}, solicitado ${quantidade}`,
      };
    }

    const registro = await movimentacaoRepository.criar({
      material_id: dados.material_id,
      usuario_id: usuarioId,
      tipo: dados.tipo,
      quantidade,
      observacao: dados.observacao,
    }, db);
    const atualizado = await materialRepository.ajustarQuantidade(dados.material_id, delta, db);

    return { movimentacao: registro, antes: material, depois: atualizado };
  });

  // Notificação fora da transação: se o aviso falhar, a movimentação já valeu.
  const estavaOk = antes.quantidade > antes.estoque_minimo;
  const ficouBaixo = depois.quantidade <= depois.estoque_minimo;
  if (delta < 0 && estavaOk && ficouBaixo) {
    await eventos.estoqueBaixo(depois);
  }

  return movimentacao;
}

module.exports = { listar, buscarPorId, criar };
