// Service: auth
// Regras de negócio de autenticação

const bcrypt = require('bcrypt');
const { gerarToken } = require('../utils/jwt');
const authRepository = require('../repositories/authRepository');

async function login(email, senha) {
  // 1. Busca o usuário pelo email
  const usuario = await authRepository.findByEmail(email);
  if (!usuario) {
    throw { status: 401, message: 'Email ou senha inválidos' };
  }

  // 2. Compara a senha com o hash armazenado
  const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
  if (!senhaValida) {
    throw { status: 401, message: 'Email ou senha inválidos' };
  }

  // 3. Gera o token JWT com dados básicos do usuário
  const token = gerarToken({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
  });

  return {
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      setor: usuario.setor,
    },
  };
}

module.exports = { login };
