// Regras de cirurgias, mutirão cirúrgico e compartilhamento de cursos
// (mais de um aluno vinculado à mesma cirurgia).

const cirurgiaRepository = require('../repositories/cirurgiaRepository');
const pacienteRepository = require('../repositories/pacienteRepository');
const materialRepository = require('../repositories/materialRepository');
const auditLogger = require('../utils/auditLogger');

const STATUS_VALIDOS = ['agendada', 'realizada', 'cancelada'];
const PAPEIS_VALIDOS = ['executante', 'auxiliar', 'observador'];

// ── Cirurgia ─────────────────────────────────────────────────

async function listar(filtros = {}) {
  if (filtros.status && !STATUS_VALIDOS.includes(filtros.status)) {
    throw { status: 400, message: `Status inválido. Use um de: ${STATUS_VALIDOS.join(', ')}` };
  }
  return cirurgiaRepository.listar(filtros);
}

async function buscarPorId(id) {
  const cirurgia = await cirurgiaRepository.buscarPorId(id);
  if (!cirurgia) throw { status: 404, message: 'Cirurgia não encontrada' };
  return cirurgia;
}

async function criar(dados) {
  const { paciente_id, usuario_id, data_hora } = dados;

  if (!paciente_id || !usuario_id || !data_hora) {
    throw { status: 400, message: 'Paciente, usuário e data/hora são obrigatórios' };
  }
  if (Number.isNaN(new Date(data_hora).getTime())) {
    throw { status: 400, message: 'Data/hora inválida' };
  }
  if (dados.status && !STATUS_VALIDOS.includes(dados.status)) {
    throw { status: 400, message: `Status inválido. Use um de: ${STATUS_VALIDOS.join(', ')}` };
  }

  const paciente = await pacienteRepository.buscarPorId(paciente_id);
  if (!paciente) throw { status: 404, message: 'Paciente não encontrado' };

  if (dados.mutirao_id) {
    const mutirao = await cirurgiaRepository.buscarMutiraoPorId(dados.mutirao_id);
    if (!mutirao) throw { status: 404, message: 'Mutirão cirúrgico não encontrado' };
  }

  const cirurgia = await cirurgiaRepository.criar(dados);
  auditLogger.info('Cirurgia agendada', { cirurgia_id: cirurgia.id, paciente_id, usuario_id, tipo_cirurgia: dados.tipo_cirurgia });
  return cirurgia;
}

async function atualizar(id, dados) {
  const cirurgia = await cirurgiaRepository.buscarPorId(id);
  if (!cirurgia) throw { status: 404, message: 'Cirurgia não encontrada' };

  if (dados.status && !STATUS_VALIDOS.includes(dados.status)) {
    throw { status: 400, message: `Status inválido. Use um de: ${STATUS_VALIDOS.join(', ')}` };
  }

  if (dados.paciente_id) {
    const paciente = await pacienteRepository.buscarPorId(dados.paciente_id);
    if (!paciente) throw { status: 404, message: 'Paciente não encontrado' };
  }

  if (dados.mutirao_id) {
    const mutirao = await cirurgiaRepository.buscarMutiraoPorId(dados.mutirao_id);
    if (!mutirao) throw { status: 404, message: 'Mutirão cirúrgico não encontrado' };
  }

  const dadosAtualizados = {
    paciente_id: dados.paciente_id ?? cirurgia.paciente_id,
    usuario_id: dados.usuario_id ?? cirurgia.usuario_id,
    data_hora: dados.data_hora ?? cirurgia.data_hora,
    tipo_cirurgia: dados.tipo_cirurgia ?? cirurgia.tipo_cirurgia,
    observacoes: dados.observacoes ?? cirurgia.observacoes,
    status: dados.status ?? cirurgia.status,
    mutirao_id: dados.mutirao_id ?? cirurgia.mutirao_id,
  };

  const atualizada = await cirurgiaRepository.atualizar(id, dadosAtualizados);
  if (dados.status === 'cancelada') {
    auditLogger.warn('Cirurgia cancelada', { cirurgia_id: id });
  } else if (dados.status === 'realizada') {
    auditLogger.info('Cirurgia realizada', { cirurgia_id: id });
  }
  return atualizada;
}

async function deletar(id) {
  const deletado = await cirurgiaRepository.deletar(id);
  if (!deletado) throw { status: 404, message: 'Cirurgia não encontrada' };
  auditLogger.warn('Cirurgia removida', { cirurgia_id: id });
  return { message: 'Cirurgia removida com sucesso' };
}

// ── Mutirão cirúrgico ────────────────────────────────────────

async function listarMutiroes() {
  return cirurgiaRepository.listarMutiroes();
}

async function buscarMutiraoPorId(id) {
  const mutirao = await cirurgiaRepository.buscarMutiraoPorId(id);
  if (!mutirao) throw { status: 404, message: 'Mutirão cirúrgico não encontrado' };
  return mutirao;
}

async function criarMutirao(dados, usuarioId) {
  const { nome, data_evento } = dados;
  if (!nome || !data_evento) {
    throw { status: 400, message: 'Nome e data do evento são obrigatórios' };
  }
  if (Number.isNaN(new Date(data_evento).getTime())) {
    throw { status: 400, message: 'Data do evento inválida' };
  }
  const mutirao = await cirurgiaRepository.criarMutirao(dados, usuarioId);
  auditLogger.info('Mutirão cirúrgico criado', { mutirao_id: mutirao.id, nome });
  return mutirao;
}

async function atualizarMutirao(id, dados) {
  await buscarMutiraoPorId(id);
  if (dados.data_evento && Number.isNaN(new Date(dados.data_evento).getTime())) {
    throw { status: 400, message: 'Data do evento inválida' };
  }
  return cirurgiaRepository.atualizarMutirao(id, dados);
}

async function deletarMutirao(id) {
  const deletado = await cirurgiaRepository.deletarMutirao(id);
  if (!deletado) throw { status: 404, message: 'Mutirão cirúrgico não encontrado' };
  return { message: 'Mutirão cirúrgico removido com sucesso' };
}

async function listarCirurgiasDoMutirao(id) {
  await buscarMutiraoPorId(id);
  return cirurgiaRepository.listar({ mutirao_id: id });
}

// ── Compartilhamento de cursos ───────────────────────────────

async function listarAlunosDaCirurgia(cirurgiaId) {
  await buscarPorId(cirurgiaId);
  return cirurgiaRepository.listarAlunosDaCirurgia(cirurgiaId);
}

async function vincularAluno(cirurgiaId, dados) {
  await buscarPorId(cirurgiaId);
  const { usuario_id, papel } = dados;
  if (!usuario_id) throw { status: 400, message: 'usuario_id (aluno) é obrigatório' };
  if (papel && !PAPEIS_VALIDOS.includes(papel)) {
    throw { status: 400, message: `Papel inválido. Use um de: ${PAPEIS_VALIDOS.join(', ')}` };
  }

  const jaVinculados = await cirurgiaRepository.listarAlunosDaCirurgia(cirurgiaId);
  if (jaVinculados.some((v) => v.usuario_id === usuario_id)) {
    throw { status: 409, message: 'Este aluno já está vinculado a esta cirurgia' };
  }

  const vinculo = await cirurgiaRepository.vincularAluno(cirurgiaId, dados);
  auditLogger.info('Aluno vinculado à cirurgia (compartilhamento de curso)', { cirurgia_id: cirurgiaId, usuario_id, curso: dados.curso });
  return vinculo;
}

async function desvincularAluno(id) {
  const removido = await cirurgiaRepository.desvincularAluno(id);
  if (!removido) throw { status: 404, message: 'Vínculo não encontrado' };
  return { message: 'Aluno desvinculado da cirurgia com sucesso' };
}

// ── Materiais previstos para a cirurgia ─────────────────────
// Checklist real (persistido), antes existia só localmente na tela.

async function listarMateriaisDaCirurgia(cirurgiaId) {
  await buscarPorId(cirurgiaId);
  return cirurgiaRepository.listarMateriaisDaCirurgia(cirurgiaId);
}

async function adicionarMaterial(cirurgiaId, dados) {
  await buscarPorId(cirurgiaId);

  const { material_id, quantidade } = dados;
  if (!material_id) throw { status: 400, message: 'material_id é obrigatório' };

  const material = await materialRepository.buscarPorId(material_id);
  if (!material) throw { status: 404, message: 'Material não encontrado' };

  if (quantidade != null && Number(quantidade) < 0) {
    throw { status: 400, message: 'Quantidade não pode ser negativa' };
  }

  const jaVinculado = await cirurgiaRepository.buscarVinculoPorCirurgiaEMaterial(cirurgiaId, material_id);
  if (jaVinculado) {
    throw { status: 409, message: 'Este material já está vinculado a esta cirurgia' };
  }

  const vinculo = await cirurgiaRepository.adicionarMaterial(cirurgiaId, { material_id, quantidade });
  auditLogger.info('Material vinculado à cirurgia', { cirurgia_id: cirurgiaId, material_id, quantidade: vinculo.quantidade });
  return vinculo;
}

async function atualizarQuantidadeMaterial(cirurgiaId, vinculoId, quantidade) {
  await buscarPorId(cirurgiaId);

  if (quantidade == null || Number(quantidade) < 0) {
    throw { status: 400, message: 'Quantidade é obrigatória e não pode ser negativa' };
  }

  const vinculo = await cirurgiaRepository.buscarMaterialDaCirurgiaPorId(vinculoId);
  if (!vinculo || vinculo.cirurgia_id !== Number(cirurgiaId)) {
    throw { status: 404, message: 'Material não encontrado nesta cirurgia' };
  }

  return cirurgiaRepository.atualizarQuantidadeMaterial(vinculoId, quantidade);
}

async function removerMaterial(cirurgiaId, vinculoId) {
  await buscarPorId(cirurgiaId);

  const vinculo = await cirurgiaRepository.buscarMaterialDaCirurgiaPorId(vinculoId);
  if (!vinculo || vinculo.cirurgia_id !== Number(cirurgiaId)) {
    throw { status: 404, message: 'Material não encontrado nesta cirurgia' };
  }

  await cirurgiaRepository.removerMaterial(vinculoId);
  return { message: 'Material removido do checklist da cirurgia' };
}

module.exports = {
  listar, buscarPorId, criar, atualizar, deletar,
  listarMutiroes, buscarMutiraoPorId, criarMutirao, atualizarMutirao, deletarMutirao, listarCirurgiasDoMutirao,
  listarAlunosDaCirurgia, vincularAluno, desvincularAluno,
  listarMateriaisDaCirurgia, adicionarMaterial, atualizarQuantidadeMaterial, removerMaterial,
};
