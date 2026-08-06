// Regras de cadastro de usuários do sistema (professor, aluno, recepcionista).

const bcrypt = require('bcrypt');
const usuarioRepository = require('../repositories/usuarioRepository');

const PERFIS_VALIDOS = ['professor', 'aluno', 'recepcionista'];

async function listar(filtros) {
  return usuarioRepository.listar(filtros);
}

async function buscarPorId(id) {
  const usuario = await usuarioRepository.buscarPorId(id);
  if (!usuario) throw { status: 404, message: 'Usuário não encontrado' };
  return usuario;
}

async function criar(dados) {
  const { nome, cpf, email, senha, perfil } = dados;

  if (!nome || !cpf || !email || !senha || !perfil) {
    throw { status: 400, message: 'Nome, CPF, e-mail, senha e perfil são obrigatórios' };
  }
  if (!PERFIS_VALIDOS.includes(perfil)) {
    throw { status: 400, message: `Perfil inválido. Use: ${PERFIS_VALIDOS.join(', ')}` };
  }
  if (senha.length < 6) {
    throw { status: 400, message: 'A senha deve ter ao menos 6 caracteres' };
  }

  if (await usuarioRepository.buscarPorEmail(email)) {
    throw { status: 409, message: 'Já existe um usuário cadastrado com esse e-mail' };
  }
  if (await usuarioRepository.buscarPorCpf(cpf)) {
    throw { status: 409, message: 'Já existe um usuário cadastrado com esse CPF' };
  }

  const senha_hash = await bcrypt.hash(senha, 10);

  return usuarioRepository.criar({
    nome,
    cpf,
    email,
    senha_hash,
    telefone: dados.telefone,
    setor: dados.setor,
    perfil,
    data_admissao: dados.data_admissao,
  });
}

async function atualizar(id, dados) {
  const usuario = await buscarPorId(id);

  if (dados.perfil && !PERFIS_VALIDOS.includes(dados.perfil)) {
    throw { status: 400, message: `Perfil inválido. Use: ${PERFIS_VALIDOS.join(', ')}` };
  }

  if (dados.email && dados.email !== usuario.email) {
    const emailEmUso = await usuarioRepository.buscarPorEmail(dados.email);
    if (emailEmUso) throw { status: 409, message: 'E-mail já cadastrado para outro usuário' };
  }
  if (dados.cpf && dados.cpf !== usuario.cpf) {
    const cpfEmUso = await usuarioRepository.buscarPorCpf(dados.cpf);
    if (cpfEmUso) throw { status: 409, message: 'CPF já cadastrado para outro usuário' };
  }

  let senha_hash = null;
  if (dados.senha) {
    if (dados.senha.length < 6) {
      throw { status: 400, message: 'A senha deve ter ao menos 6 caracteres' };
    }
    senha_hash = await bcrypt.hash(dados.senha, 10);
  }

  return usuarioRepository.atualizar(id, {
    nome: dados.nome ?? usuario.nome,
    cpf: dados.cpf ?? usuario.cpf,
    email: dados.email ?? usuario.email,
    telefone: dados.telefone ?? usuario.telefone,
    setor: dados.setor ?? usuario.setor,
    perfil: dados.perfil ?? usuario.perfil,
    data_admissao: dados.data_admissao ?? usuario.data_admissao,
    ativo: typeof dados.ativo === 'boolean' ? dados.ativo : usuario.ativo,
    senha_hash,
  });
}

// usuarioLogadoId vem do token de quem está fazendo a chamada — ninguém
// pode excluir a própria conta por essa rota.
async function deletar(id, usuarioLogadoId) {
  if (Number(id) === Number(usuarioLogadoId)) {
    throw { status: 400, message: 'Não é possível excluir a própria conta' };
  }
  const deletado = await usuarioRepository.deletar(id);
  if (!deletado) throw { status: 404, message: 'Usuário não encontrado' };
  return { message: 'Usuário removido com sucesso' };
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };
