const authService = require('../services/authService');
const usuarioRepository = require('../repositories/usuarioRepository');

async function login(req, res, next) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    const resultado = await authService.login(email, senha);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function solicitarRecuperacaoSenha(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email é obrigatório' });
    const resultado = await authService.solicitarRecuperacaoSenha(email);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function redefinirSenha(req, res, next) {
  try {
    const { token, nova_senha } = req.body;
    const resultado = await authService.redefinirSenha(token, nova_senha);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me — devolve os dados atuais do usuário do token (o
// front usa isso pra validar a sessão ao carregar a página, em vez de
// só confiar cegamente no que está salvo no localStorage).
async function me(req, res, next) {
  try {
    const usuario = await usuarioRepository.buscarPorId(req.user.id);
    if (!usuario) {
      return res.status(401).json({ message: 'Usuário do token não existe mais' });
    }
    res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, solicitarRecuperacaoSenha, redefinirSenha, me };
