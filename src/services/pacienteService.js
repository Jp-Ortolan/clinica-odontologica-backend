// Service: paciente
// Contém as regras de negócio do módulo de pacientes

const pacienteRepository = require('../repositories/pacienteRepository');
const viaCep = require('../utils/viaCep');

async function listar() {
  return pacienteRepository.listar();
}

async function buscarPorId(id) {
  const paciente = await pacienteRepository.buscarPorId(id);
  if (!paciente) throw { status: 404, message: 'Paciente não encontrado' };
  return paciente;
}

async function buscarEnderecoPorCep(cep) {
  // Consulta a API ViaCEP e retorna os dados do endereço
  return viaCep.buscarEnderecoPorCep(cep);
}

async function criar(dados) {
  const { nome, cpf, data_nascimento } = dados;

  // Regra: campos obrigatórios
  if (!nome || !cpf || !data_nascimento) {
    throw { status: 400, message: 'Nome, CPF e data de nascimento são obrigatórios' };
  }

  // Regra: CPF não pode ser duplicado
  const pacienteExistente = await pacienteRepository.buscarPorCpf(cpf);
  if (pacienteExistente) {
    throw { status: 409, message: 'Já existe um paciente cadastrado com esse CPF' };
  }

  return pacienteRepository.criar(dados);
}

async function atualizar(id, dados) {
  // Verifica se o paciente existe
  const paciente = await pacienteRepository.buscarPorId(id);
  if (!paciente) throw { status: 404, message: 'Paciente não encontrado' };

  // Se o CPF foi alterado, verifica duplicidade
  if (dados.cpf && dados.cpf !== paciente.cpf) {
    const cpfEmUso = await pacienteRepository.buscarPorCpf(dados.cpf);
    if (cpfEmUso) throw { status: 409, message: 'CPF já cadastrado para outro paciente' };
  }

  // Mantém os dados atuais para campos não enviados
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

async function deletar(id) {
  const deletado = await pacienteRepository.deletar(id);
  if (!deletado) throw { status: 404, message: 'Paciente não encontrado' };
  return { message: 'Paciente removido com sucesso' };
}

module.exports = { listar, buscarPorId, buscarEnderecoPorCep, criar, atualizar, deletar };
