// Regras da agenda de consultas.

const consultaRepository = require('../repositories/consultaRepository');
const pacienteRepository = require('../repositories/pacienteRepository');
const materialRepository = require('../repositories/materialRepository');
const notificacaoRepository = require('../repositories/notificacaoRepository');
const auditLogger = require('../utils/auditLogger');

// Avisa o profissional responsável sobre mudanças na agenda dele.
// Envolvido em try/catch porque notificação é acessório: se falhar, o
// agendamento em si não pode quebrar junto.
async function notificarResponsavel(usuarioId, { titulo, mensagem, link, referencia_id }) {
  if (!usuarioId) return;
  try {
    await notificacaoRepository.criar({
      usuario_id: usuarioId,
      titulo,
      mensagem,
      tipo: 'consulta',
      link,
      referencia_id,
    });
  } catch (err) {
    auditLogger.warn('Falha ao criar notificação de consulta', { erro: err.message });
  }
}

function formatarDataHora(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// Cobre os estados do protótipo: confirmações pendentes, confirmadas,
// paciente aguardando, em atendimento e faltas.
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

  await notificarResponsavel(usuario_id, {
    titulo: 'Nova consulta agendada',
    mensagem: `${paciente.nome} — ${formatarDataHora(data_hora)}`,
    referencia_id: consulta.id,
  });

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
    await notificarResponsavel(dadosAtualizados.usuario_id, {
      titulo: 'Consulta cancelada',
      mensagem: `Agendamento de ${formatarDataHora(dadosAtualizados.data_hora)} foi cancelado`,
      referencia_id: id,
    });
  } else if (dados.status === 'faltou') {
    auditLogger.warn('Falta registrada', { consulta_id: id });
  } else if (dados.status === 'realizada') {
    auditLogger.info('Consulta realizada', { consulta_id: id });
  } else if (dados.data_hora && dados.data_hora !== consulta.data_hora) {
    // Reagendamento: a data mudou sem que o status virasse cancelada.
    await notificarResponsavel(dadosAtualizados.usuario_id, {
      titulo: 'Consulta reagendada',
      mensagem: `Novo horário: ${formatarDataHora(dadosAtualizados.data_hora)}`,
      referencia_id: id,
    });
  }
  return atualizada;
}

async function deletar(id) {
  const deletado = await consultaRepository.deletar(id);
  if (!deletado) throw { status: 404, message: 'Consulta não encontrada' };
  auditLogger.warn('Consulta removida', { consulta_id: id });
  return { message: 'Consulta removida com sucesso' };
}

// ── Materiais previstos da consulta ─────────────────────────────────────
// Mesmas regras já aplicadas ao checklist de cirurgia (cirurgiaService).

async function listarMateriaisDaConsulta(consultaId) {
  await buscarPorId(consultaId);
  return consultaRepository.listarMateriaisDaConsulta(consultaId);
}

async function adicionarMaterial(consultaId, dados) {
  await buscarPorId(consultaId);

  const { material_id, quantidade } = dados;
  if (!material_id) throw { status: 400, message: 'material_id é obrigatório' };

  const material = await materialRepository.buscarPorId(material_id);
  if (!material) throw { status: 404, message: 'Material não encontrado' };

  if (quantidade != null && Number(quantidade) < 0) {
    throw { status: 400, message: 'Quantidade não pode ser negativa' };
  }

  const jaVinculado = await consultaRepository.buscarVinculoPorConsultaEMaterial(consultaId, material_id);
  if (jaVinculado) {
    throw { status: 409, message: 'Este material já está vinculado a esta consulta' };
  }

  const vinculo = await consultaRepository.adicionarMaterial(consultaId, { material_id, quantidade });
  auditLogger.info('Material vinculado à consulta', {
    consulta_id: consultaId, material_id, quantidade: vinculo.quantidade,
  });
  return vinculo;
}

async function atualizarQuantidadeMaterial(consultaId, vinculoId, quantidade) {
  await buscarPorId(consultaId);

  if (quantidade == null || Number(quantidade) < 0) {
    throw { status: 400, message: 'Quantidade é obrigatória e não pode ser negativa' };
  }

  const vinculo = await consultaRepository.buscarMaterialDaConsultaPorId(vinculoId);
  if (!vinculo || vinculo.consulta_id !== Number(consultaId)) {
    throw { status: 404, message: 'Material não encontrado nesta consulta' };
  }

  return consultaRepository.atualizarQuantidadeMaterial(vinculoId, quantidade);
}

async function removerMaterial(consultaId, vinculoId) {
  await buscarPorId(consultaId);

  const vinculo = await consultaRepository.buscarMaterialDaConsultaPorId(vinculoId);
  if (!vinculo || vinculo.consulta_id !== Number(consultaId)) {
    throw { status: 404, message: 'Material não encontrado nesta consulta' };
  }

  await consultaRepository.removerMaterial(vinculoId);
  return { message: 'Material removido do checklist da consulta' };
}

module.exports = {
  listar, buscarPorId, criar, atualizar, deletar,
  listarMateriaisDaConsulta, adicionarMaterial,
  atualizarQuantidadeMaterial, removerMaterial,
};
