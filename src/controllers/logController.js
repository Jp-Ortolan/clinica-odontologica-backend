const logService = require('../services/logService');

async function listarAuditoria(req, res, next) {
  try {
    const { nivel, limite } = req.query;
    const eventos = await logService.listarAuditoria({ nivel, limite });
    res.status(200).json(eventos);
  } catch (err) {
    next(err);
  }
}

module.exports = { listarAuditoria };
