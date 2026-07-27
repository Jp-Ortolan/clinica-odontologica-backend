// Regras de pacientes e das informações relacionadas: alergias,
// medicamentos, documentos e evolução clínica.

const pacienteRepository = require('../repositories/pacienteRepository');
const viaCep = require('../utils/viaCep');
const auditLogger = require('../utils/auditLogger');

const GRAVIDADES_VALIDAS = ['leve', 'moderada', 'grave'];
const TIPOS_ARQUIVO_ACEITOS_MB = 8; // limite de tamanho por documento

// ── Paciente ─────────────────────────────────────────────────

async function listar(filtros = {}) {
  return pacienteRepository.listar(filtros);
}

async function buscarPorId(id) {
  const paciente = await pacienteRepository.buscarPorId(id);
  if (!paciente) throw { status: 404, message: 'Paciente não encontrado' };
  return paciente;
}

async function buscarEnderecoPorCep(cep) {
  return viaCep.buscarEnderecoPorCep(cep);
}

async function criar(dados) {
  const { nome, cpf, data_nascimento } = dados;

  if (!nome || !cpf || !data_nascimento) {
    throw { status: 400, message: 'Nome, CPF e data de nascimento são obrigatórios' };
  }

  const pacienteExistente = await pacienteRepository.buscarPorCpf(cpf);
  if (pacienteExistente) {
    throw { status: 409, message: 'Já existe um paciente cadastrado com esse CPF' };
  }

  return pacienteRepository.criar(dados);
}

async function atualizar(id, dados) {
  const paciente = await pacienteRepository.buscarPorId(id);
  if (!paciente) throw { status: 404, message: 'Paciente não encontrado' };

  if (dados.cpf && dados.cpf !== paciente.cpf) {
    const cpfEmUso = await pacienteRepository.buscarPorCpf(dados.cpf);
    if (cpfEmUso) throw { status: 409, message: 'CPF já cadastrado para outro paciente' };
  }

  const dadosAtualizados = {
    nome: dados.nome ?? paciente.nome,
    cpf: dados.cpf ?? paciente.cpf,
    data_nascimento: dados.data_nascimento ?? paciente.data_nascimento,
    telefone: dados.telefone ?? paciente.telefone,
    email: dados.email ?? paciente.email,
    endereco: dados.endereco ?? paciente.endereco,
  };

  return pacienteRepository.atualizar(id, dadosAtualizados);
}

async function atualizarStatusAtivo(id, ativo) {
  if (typeof ativo !== 'boolean') {
    throw { status: 400, message: 'Campo "ativo" deve ser true ou false' };
  }
  const paciente = await pacienteRepository.buscarPorId(id);
  if (!paciente) throw { status: 404, message: 'Paciente não encontrado' };

  const atualizado = await pacienteRepository.atualizarStatusAtivo(id, ativo);
  auditLogger.info(ativo ? 'Paciente reativado' : 'Paciente inativado', { paciente_id: id });
  return atualizado;
}

async function deletar(id) {
  const deletado = await pacienteRepository.deletar(id);
  if (!deletado) throw { status: 404, message: 'Paciente não encontrado' };
  return { message: 'Paciente removido com sucesso' };
}

// ── Alergias ─────────────────────────────────────────────────

async function listarAlergias(pacienteId) {
  await buscarPorId(pacienteId); // valida que o paciente existe
  return pacienteRepository.listarAlergias(pacienteId);
}

async function criarAlergia(pacienteId, dados) {
  await buscarPorId(pacienteId);
  const { substancia, gravidade } = dados;
  if (!substancia) throw { status: 400, message: 'Substância é obrigatória' };
  if (gravidade && !GRAVIDADES_VALIDAS.includes(gravidade)) {
    throw { status: 400, message: `Gravidade inválida. Use: ${GRAVIDADES_VALIDAS.join(', ')}` };
  }
  return pacienteRepository.criarAlergia(pacienteId, dados);
}

async function deletarAlergia(id) {
  const deletado = await pacienteRepository.deletarAlergia(id);
  if (!deletado) throw { status: 404, message: 'Alergia não encontrada' };
  return { message: 'Alergia removida com sucesso' };
}

// ── Medicamentos ─────────────────────────────────────────────

async function listarMedicamentos(pacienteId) {
  await buscarPorId(pacienteId);
  return pacienteRepository.listarMedicamentos(pacienteId);
}

async function criarMedicamento(pacienteId, dados) {
  await buscarPorId(pacienteId);
  if (!dados.nome_medicamento) throw { status: 400, message: 'Nome do medicamento é obrigatório' };
  return pacienteRepository.criarMedicamento(pacienteId, dados);
}

async function deletarMedicamento(id) {
  const deletado = await pacienteRepository.deletarMedicamento(id);
  if (!deletado) throw { status: 404, message: 'Medicamento não encontrado' };
  return { message: 'Medicamento removido com sucesso' };
}

// ── Documentos ───────────────────────────────────────────────

async function listarDocumentos(pacienteId) {
  await buscarPorId(pacienteId);
  return pacienteRepository.listarDocumentos(pacienteId);
}

async function criarDocumento(pacienteId, usuarioId, dados) {
  await buscarPorId(pacienteId);
  const { nome_arquivo, tipo_arquivo, conteudo_base64 } = dados;

  if (!nome_arquivo || !conteudo_base64) {
    throw { status: 400, message: 'Nome do arquivo e conteúdo (base64) são obrigatórios' };
  }

  let buffer;
  try {
    buffer = Buffer.from(conteudo_base64, 'base64');
  } catch {
    throw { status: 400, message: 'Conteúdo base64 inválido' };
  }
  if (buffer.length === 0) throw { status: 400, message: 'Arquivo vazio' };

  const limiteBytes = TIPOS_ARQUIVO_ACEITOS_MB * 1024 * 1024;
  if (buffer.length > limiteBytes) {
    throw { status: 400, message: `Arquivo excede o limite de ${TIPOS_ARQUIVO_ACEITOS_MB}MB` };
  }

  const documento = await pacienteRepository.criarDocumento(pacienteId, usuarioId, {
    nome_arquivo,
    tipo_arquivo: tipo_arquivo || 'application/octet-stream',
    tamanho_bytes: buffer.length,
    conteudo: buffer,
  });
  auditLogger.info('Documento anexado ao paciente', { paciente_id: pacienteId, documento_id: documento.id, nome_arquivo });
  return documento;
}

async function baixarDocumento(id) {
  const documento = await pacienteRepository.buscarDocumentoPorId(id);
  if (!documento) throw { status: 404, message: 'Documento não encontrado' };
  return documento;
}

async function deletarDocumento(id) {
  const deletado = await pacienteRepository.deletarDocumento(id);
  if (!deletado) throw { status: 404, message: 'Documento não encontrado' };
  auditLogger.warn('Documento removido do paciente', { documento_id: id });
  return { message: 'Documento removido com sucesso' };
}

// ── Evolução do paciente ─────────────────────────────────────

async function listarEvolucoes(pacienteId) {
  await buscarPorId(pacienteId);
  return pacienteRepository.listarEvolucoes(pacienteId);
}

async function criarEvolucao(pacienteId, usuarioId, dados) {
  await buscarPorId(pacienteId);
  if (!dados.descricao || !dados.descricao.trim()) {
    throw { status: 400, message: 'Descrição da evolução é obrigatória' };
  }
  const evolucao = await pacienteRepository.criarEvolucao(pacienteId, usuarioId, dados);
  auditLogger.info('Evolução registrada', { paciente_id: pacienteId, evolucao_id: evolucao.id });
  return evolucao;
}

module.exports = {
  listar, buscarPorId, buscarEnderecoPorCep, criar, atualizar, atualizarStatusAtivo, deletar,
  listarAlergias, criarAlergia, deletarAlergia,
  listarMedicamentos, criarMedicamento, deletarMedicamento,
  listarDocumentos, criarDocumento, baixarDocumento, deletarDocumento,
  listarEvolucoes, criarEvolucao,
};
