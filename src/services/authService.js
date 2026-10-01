const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { gerarToken } = require('../utils/jwt');
const authRepository = require('../repositories/authRepository');

const recoveryRepository = require('../repositories/recoveryRepository');
const recoveryEmail = require('./recoveryEmailService');

function validarEmail(email) {
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw { status: 400, message: 'Informe um e-mail v?lido.' };
  }
  return email.trim();
}

function resumoCodigo(email, codigo) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(JSON.stringify([email, codigo])).digest('hex');
}

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

async function solicitarRecuperacaoSenha(email) {
  email = validarEmail(email);
  recoveryEmail.verificarConfiguracao();
  const resposta = { message: 'Se o e-mail estiver cadastrado, voc? receber? um c?digo de confirma??o.' };
  const usuario = await authRepository.findByEmail(email);
  if (!usuario) return resposta;
  const codigo = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const digest = resumoCodigo(email, codigo);
  if (!await recoveryRepository.reservarCodigo(usuario.id, digest)) return resposta;
  try {
    await recoveryEmail.enviarCodigo(usuario.email, codigo);
  } catch (err) {
    await recoveryRepository.invalidarCodigo(usuario.id, digest);
    throw err;
  }
  return resposta;
}

async function redefinirSenha(email, codigo, novaSenha) {
  email = validarEmail(email);
  if (typeof codigo !== 'string' || !/^\d{6}$/.test(codigo)) {
    throw { status: 400, message: 'Informe o c?digo de 6 d?gitos recebido por e-mail.' };
  }
  if (typeof novaSenha !== 'string' || novaSenha.length < 6 || Buffer.byteLength(novaSenha, 'utf8') > 72) {
    throw { status: 400, message: 'A senha deve ter ao menos 6 caracteres e no m?ximo 72 bytes.' };
  }
  if (!process.env.JWT_SECRET) throw { status: 503, message: 'Recupera??o indispon?vel.' };
  const senhaHash = await bcrypt.hash(novaSenha, 10);
  const sucesso = await recoveryRepository.consumirCodigo(email, resumoCodigo(email, codigo), senhaHash);
  if (!sucesso) throw { status: 400, message: 'C?digo inv?lido, expirado ou limite de tentativas atingido. Solicite outro c?digo.' };
  return { message: 'Senha redefinida com sucesso' };
}

module.exports = { login, solicitarRecuperacaoSenha, redefinirSenha };
