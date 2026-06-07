// Controller: auth
// Recebe req/res e delega ao service

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

module.exports = { login };
