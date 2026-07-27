// Mostra o que cada perfil pode fazer no sistema — usado pela tela
// "Permissões" do protótipo.
const { obterMatriz, obterPorPerfil } = require('../config/permissoes');

async function listar(req, res, next) {
  try {
    if (req.query.perfil) {
      return res.status(200).json(obterPorPerfil(req.query.perfil));
    }
    res.status(200).json(obterMatriz());
  } catch (err) {
    next(err);
  }
}

module.exports = { listar };
