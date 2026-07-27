// Service: consulta
// Contém as regras de negócio do módulo de consultas (agenda)

const consultaRepository = require('../repositories/consultaRepository');
const pacienteRepository = require('../repositories/pacienteRepository');
const auditLogger = require('../utils/auditLogger');

// Ampliado para cobrir os estados desenhados no protótipo (telas
// "Confirmações pendentes", "Confirmados", "Pacientes aguardando",
// "Pacientes em atendimento" e "Faltas"), além do fluxo original.
const STATUS_VALIDOS = [
  'agendada', 'confirmada', 'aguardando', 'em_atendimento',
  'realizada', 'cancelada', 'faltou',
];

async function listar(filtros = {}) {
  if (filtros.status && !STATUS_VALIDOS.includes(filtros.status)) {
    throw { status: 400, message: `Status inválido. Use um de: ${STATUS_VALIDOS.join(', ')}` };
  }
  return consultaRepository.listar(filtros);
}

async function buscarPorId(id) {
  const consulta = await consultaRepository.buscarPorId(id);
  if (!consulta) throw { status: 404, message: 'Consulta não encontrada' };
  return consulta;
}

async function criar(dados) {
  const { paciente_id, usuario_id, data_hora } = dados;

  // Regra: campos obrigatórios
  if (!paciente_id || !usuario_id || !data_hora) {
    throw { status: 400, message: 'Paciente, usuário e data/hora são obrigatórios' };
  }

  // Regra: data/hora precisa ser válida
  if (Number.isNaN(new Date(data_hora).getTime())) {
    throw { status: 400, message: 'Data/hora inválida' };
  }

  // Regra: status, se informado, precisa ser um dos valores aceitos
  if (dados.status && !STATUS_VALIDOS.includes(dados.status)) {
    throw { status: 400, message: `Status inválido. Use um de: ${STATUS_VALIDOS.join(', ')}` };
  }

  // Regra: paciente precisa existir
  const paciente = await pacienteRepository.buscarPorId(paciente_id);
  if (!paciente) throw { status: 404, message: 'Paciente não encontrado' };

  const consulta = await consultaRepository.criar(dados);
  auditLogger.info('Consulta agendada', { consulta_id: consulta.id, paciente_id, usuario_id });
  return consulta;
}

async function atualizar(id, dados) {
  const consulta = await consultaRepository.buscarPorId(id);
  if (!consulta) throw { status: 404, message: 'Consulta não encontrada' };

  if (dados.status && !STATUS_VALIDOS.includes(dados.status)) {
    throw { status: 400, message: `Status inválido. Use um de: ${STATUS_VALIDOS.join(', ')}` };
  }

  if (dados.paciente_id) {
    const paciente = await pacienteRepository.buscarPorId(dados.paciente_id);
    if (!paciente) throw { status: 404, message: 'Paciente não encontrado' };
  }

  const dadosAtualizados = {
    paciente_id: dados.paciente_id ?? consulta.paciente_id,
    usuario_id: dados.usuario_id ?? consulta.usuario_id,
    data_hora: dados.data_hora ?? consulta.data_hora,
    queixa_principal: dados.queixa_principal ?? consulta.queixa_principal,
    observacoes: dados.observacoes ?? consulta.observacoes,
    status: dados.status ?? consulta.status,
  };

  const atualizada = await consultaRepository.atualizar(id, dadosAtualizados);
  if (dados.status === 'cancelada') {
    auditLogger.warn('Consulta cancelada', { consulta_id: id });
  } else if (dados.status === 'faltou') {
    auditLogger.warn('Falta registrada', { consulta_id: id });
  } else if (dados.status === 'realizada') {
    auditLogger.info('Consulta realizada', { consulta_id: id });
  }
  return atualizada;
}

async function deletar(id) {
  const deletado = await consultaRepository.deletar(id);
  if (!deletado) throw { status: 404, message: 'Consulta não encontrada' };
  auditLogger.warn('Consulta removida', { consulta_id: id });
  return { message: 'Consulta removida com sucesso' };
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };
