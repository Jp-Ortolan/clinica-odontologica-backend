const controleBiologicoRepository = require('../repositories/controleBiologicoRepository');
const esterilizacaoRepository     = require('../repositories/esterilizacaoRepository');

const TIPOS_VALIDOS     = ['bowie_dick', 'biologico', 'quimico'];
const RESULTADOS_VALIDOS = ['pendente', 'aprovado', 'reprovado'];

async function listarPorCiclo(esterilizacaoId) {
  const ciclo = await esterilizacaoRepository.buscarPorId(esterilizacaoId);
  if (!ciclo) {
    const err = new Error('Ciclo de esterilização não encontrado');
    err.status = 404;
    throw err;
  }
  return controleBiologicoRepository.listarPorCiclo(esterilizacaoId);
}

async function buscarPorId(id) {
  const registro = await controleBiologicoRepository.buscarPorId(id);
  if (!registro) {
    const err = new Error('Controle biológico não encontrado');
    err.status = 404;
    throw err;
  }
  return registro;
}

async function criar(esterilizacaoId, dados, usuarioId) {
  const ciclo = await esterilizacaoRepository.buscarPorId(esterilizacaoId);
  if (!ciclo) {
    const err = new Error('Ciclo de esterilização não encontrado');
    err.status = 404;
    throw err;
  }

  const { tipo, resultado } = dados;

  if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
    const err = new Error(`Tipo inválido. Use: ${TIPOS_VALIDOS.join(', ')}`);
    err.status = 400;
    throw err;
  }
  if (resultado && !RESULTADOS_VALIDOS.includes(resultado)) {
    const err = new Error(`Resultado inválido. Use: ${RESULTADOS_VALIDOS.join(', ')}`);
    err.status = 400;
    throw err;
  }

  return controleBiologicoRepository.criar({
    ...dados,
    esterilizacao_id: esterilizacaoId,
    testado_por_id: usuarioId,
  });
}

async function atualizar(id, dados) {
  const registro = await controleBiologicoRepository.buscarPorId(id);
  if (!registro) {
    const err = new Error('Controle biológico não encontrado');
    err.status = 404;
    throw err;
  }
  if (dados.resultado && !RESULTADOS_VALIDOS.includes(dados.resultado)) {
    const err = new Error(`Resultado inválido. Use: ${RESULTADOS_VALIDOS.join(', ')}`);
    err.status = 400;
    throw err;
  }
  return controleBiologicoRepository.atualizar(id, dados);
}

async function deletar(id) {
  const registro = await controleBiologicoRepository.buscarPorId(id);
  if (!registro) {
    const err = new Error('Controle biológico não encontrado');
    err.status = 404;
    throw err;
  }
  await controleBiologicoRepository.deletar(id);
  return { message: 'Registro de controle biológico removido com sucesso' };
}

module.exports = { listarPorCiclo, buscarPorId, criar, atualizar, deletar };
