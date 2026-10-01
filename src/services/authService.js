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

// Gera um token de uso único, válido por 1h, para recuperação de senha.
//
// O token NUNCA volta na resposta: se voltasse, qualquer pessoa que
// soubesse o e-mail de alguém poderia trocar a senha dessa pessoa.
// Ele deve ser entregue por e-mail (fluxo da pasta backend-recuperacao).
// No banco fica só o resumo SHA-256, nunca o token em texto puro.
function resumoDoToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

async function solicitarRecuperacaoSenha(email) {
  const resposta = { message: 'Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação' };
  const usuario = await authRepository.findByEmail(email);

  // Mesma resposta exista ou não o e-mail (evita enumeração de usuários).
  if (!usuario) return resposta;

  const token = crypto.randomBytes(32).toString('hex');
  const expiraEm = new Date(Date.now() + VALIDADE_TOKEN_MINUTOS * 60 * 1000);

  await authRepository.salvarTokenRecuperacao(usuario.id, resumoDoToken(token), expiraEm);
  auditLogger.info('Recuperação de senha solicitada', { usuario_id: usuario.id });

  return resposta;
}

async function redefinirSenha(token, novaSenha) {
  if (!token || !novaSenha) {
    throw { status: 400, message: 'Token e nova senha são obrigatórios' };
  }
  if (novaSenha.length < 6) {
    throw { status: 400, message: 'A nova senha deve ter ao menos 6 caracteres' };
  }

  const usuario = await authRepository.findByResetToken(resumoDoToken(token));
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
