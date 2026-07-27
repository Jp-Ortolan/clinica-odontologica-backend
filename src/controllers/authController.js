const authService = require('../services/authService');

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

module.exports = { login, solicitarRecuperacaoSenha, redefinirSenha };
