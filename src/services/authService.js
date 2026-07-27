const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { gerarToken } = require('../utils/jwt');
const authRepository = require('../repositories/authRepository');
const auditLogger = require('../utils/auditLogger');

const VALIDADE_TOKEN_MINUTOS = 60;

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

// Gera um token de uso único, válido por 1h, pra recuperação de senha.
// Em produção esse token iria por e-mail; como o projeto não tem
// servidor de e-mail configurado, ele volta direto na resposta.
async function solicitarRecuperacaoSenha(email) {
  const usuario = await authRepository.findByEmail(email);

  // Não revela se o e-mail existe ou não (evita enumeração de usuários).
  if (!usuario) {
    return { message: 'Se o e-mail existir, um link de recuperação foi gerado' };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiraEm = new Date(Date.now() + VALIDADE_TOKEN_MINUTOS * 60 * 1000);

  await authRepository.salvarTokenRecuperacao(usuario.id, token, expiraEm);
  auditLogger.info('Recuperação de senha solicitada', { usuario_id: usuario.id });

  return {
    message: 'Se o e-mail existir, um link de recuperação foi gerado',
    // Numa API real esse token nunca voltaria aqui, só por e-mail.
    reset_token: token,
    expira_em: expiraEm,
  };
}

async function redefinirSenha(token, novaSenha) {
  if (!token || !novaSenha) {
    throw { status: 400, message: 'Token e nova senha são obrigatórios' };
  }
  if (novaSenha.length < 6) {
    throw { status: 400, message: 'A nova senha deve ter ao menos 6 caracteres' };
  }

  const usuario = await authRepository.findByResetToken(token);
  if (!usuario) {
    throw { status: 401, message: 'Token de recuperação inválido' };
  }
  if (new Date(usuario.reset_token_expires) < new Date()) {
    throw { status: 401, message: 'Token de recuperação expirado' };
  }

  const senhaHash = await bcrypt.hash(novaSenha, 10);
  await authRepository.redefinirSenha(usuario.id, senhaHash);
  auditLogger.info('Senha redefinida', { usuario_id: usuario.id });

  return { message: 'Senha redefinida com sucesso' };
}

module.exports = { login, solicitarRecuperacaoSenha, redefinirSenha };
