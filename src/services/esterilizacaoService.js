// Service: esterilizacao
// Regras de negócio — ciclos, pacotes e controle biológico.

const esterilizacaoRepository = require('../repositories/esterilizacaoRepository');
const { gerarQRCode } = require('../utils/qrcode');
const auditLogger = require('../utils/auditLogger');

const TIPOS_CICLO_VALIDOS  = ['vapor', 'calor_seco', 'plasma'];
const RESULTADOS_VALIDOS   = ['pendente', 'aprovado', 'reprovado'];
const STATUS_CICLO_VALIDOS = ['pendente', 'em_andamento', 'concluido', 'falhou'];
const STATUS_PACOTE_VALIDOS = ['esterilizado', 'utilizado', 'vencido'];

// ── Ciclos ───────────────────────────────────────────────────

async function listar(filtros) {
  return esterilizacaoRepository.listar(filtros);
}

async function buscarPorId(id) {
  const ciclo = await esterilizacaoRepository.buscarPorId(id);
  if (!ciclo) {
    const err = new Error('Ciclo de esterilização não encontrado');
    err.status = 404;
    throw err;
  }
  return ciclo;
}

async function criar(dados, usuarioId) {
  const { equipamento, tipo_ciclo, resultado, status } = dados;

  if (!equipamento || !String(equipamento).trim()) {
    const err = new Error('Equipamento é obrigatório');
    err.status = 400;
    throw err;
  }

  if (tipo_ciclo && !TIPOS_CICLO_VALIDOS.includes(tipo_ciclo)) {
    const err = new Error(`Tipo de ciclo inválido. Use: ${TIPOS_CICLO_VALIDOS.join(', ')}`);
    err.status = 400;
    throw err;
  }

  if (resultado && !RESULTADOS_VALIDOS.includes(resultado)) {
    const err = new Error(`Resultado inválido. Use: ${RESULTADOS_VALIDOS.join(', ')}`);
    err.status = 400;
    throw err;
  }

  if (status && !STATUS_CICLO_VALIDOS.includes(status)) {
    const err = new Error(`Status inválido. Use: ${STATUS_CICLO_VALIDOS.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const ciclo = await esterilizacaoRepository.criar({ ...dados, usuario_id: usuarioId });
  auditLogger.info('Ciclo de esterilização criado', { ciclo_id: ciclo.id, equipamento, usuario_id: usuarioId });
  return ciclo;
}

async function atualizar(id, dados) {
  const ciclo = await esterilizacaoRepository.buscarPorId(id);
  if (!ciclo) {
    const err = new Error('Ciclo de esterilização não encontrado');
    err.status = 404;
    throw err;
  }

  const { tipo_ciclo, resultado, status } = dados;

  if (tipo_ciclo && !TIPOS_CICLO_VALIDOS.includes(tipo_ciclo)) {
    const err = new Error(`Tipo de ciclo inválido. Use: ${TIPOS_CICLO_VALIDOS.join(', ')}`);
    err.status = 400;
    throw err;
  }
  if (resultado && !RESULTADOS_VALIDOS.includes(resultado)) {
    const err = new Error(`Resultado inválido. Use: ${RESULTADOS_VALIDOS.join(', ')}`);
    err.status = 400;
    throw err;
  }
  if (status && !STATUS_CICLO_VALIDOS.includes(status)) {
    const err = new Error(`Status inválido. Use: ${STATUS_CICLO_VALIDOS.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const atualizado = await esterilizacaoRepository.atualizar(id, dados);
  if (dados.resultado === 'reprovado') {
    auditLogger.warn('Ciclo de esterilização REPROVADO', { ciclo_id: id, resultado: dados.resultado });
  } else if (dados.status === 'concluido') {
    auditLogger.info('Ciclo de esterilização concluído', { ciclo_id: id, resultado: dados.resultado });
  }
  return atualizado;
}

async function deletar(id) {
  const ciclo = await esterilizacaoRepository.buscarPorId(id);
  if (!ciclo) {
    const err = new Error('Ciclo de esterilização não encontrado');
    err.status = 404;
    throw err;
  }
  await esterilizacaoRepository.deletar(id);
  return { message: 'Ciclo de esterilização removido com sucesso' };
}

// ── Pacotes ──────────────────────────────────────────────────

async function listarPacotes(esterilizacaoId) {
  // valida que o ciclo existe
  await buscarPorId(esterilizacaoId);
  return esterilizacaoRepository.listarPacotes(esterilizacaoId);
}

async function criarPacote(esterilizacaoId, dados) {
  // valida ciclo
  await buscarPorId(esterilizacaoId);

  const { material_id, validade } = dados;
  if (!material_id) {
    const err = new Error('Material é obrigatório para criar um pacote');
    err.status = 400;
    throw err;
  }

  // gera QR code com as informações do pacote
  const textoQR = `ciclo:${esterilizacaoId}|material:${material_id}|validade:${validade || 'N/A'}|gerado:${new Date().toISOString()}`;
  const qr_code = await gerarQRCode(textoQR);

  return esterilizacaoRepository.criarPacote({ ...dados, esterilizacao_id: esterilizacaoId, qr_code });
}

async function obterQRCode(pacoteId) {
  const pacote = await esterilizacaoRepository.buscarPacotePorId(pacoteId);
  if (!pacote) {
    const err = new Error('Pacote não encontrado');
    err.status = 404;
    throw err;
  }
  // regenera se não tiver (retrocompatibilidade com registros antigos)
  if (!pacote.qr_code) {
    const textoQR = `ciclo:${pacote.esterilizacao_id}|material:${pacote.material_id}|gerado:${new Date().toISOString()}`;
    pacote.qr_code = await gerarQRCode(textoQR);
  }
  return { pacote_id: pacote.id, material_nome: pacote.material_nome, qr_code: pacote.qr_code };
}

async function atualizarStatusPacote(pacoteId, status) {
  if (!STATUS_PACOTE_VALIDOS.includes(status)) {
    const err = new Error(`Status inválido. Use: ${STATUS_PACOTE_VALIDOS.join(', ')}`);
    err.status = 400;
    throw err;
  }
  const pacote = await esterilizacaoRepository.buscarPacotePorId(pacoteId);
  if (!pacote) {
    const err = new Error('Pacote não encontrado');
    err.status = 404;
    throw err;
  }
  return esterilizacaoRepository.atualizarStatusPacote(pacoteId, status);
}

module.exports = {
  listar, buscarPorId, criar, atualizar, deletar,
  listarPacotes, criarPacote, obterQRCode, atualizarStatusPacote,
};
