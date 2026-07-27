// Controller: permissões
// Expõe a matriz de permissões (config/permissoes.js) para a tela
// administrativa "Permissões" do protótipo.

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
