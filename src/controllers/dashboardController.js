// Controller: dashboard
const dashboardService = require('../services/dashboardService');

async function obterResumo(req, res, next) {
  try {
    const resumo = await dashboardService.obterResumo(req.user.perfil);
    res.status(200).json(resumo);
  } catch (err) {
    next(err);
  }
}

module.exports = { obterResumo };
