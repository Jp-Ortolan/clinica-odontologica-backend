// Controller: dashboard
const dashboardService = require('../services/dashboardService');
const relatorioService = require('../services/relatorioService');

async function obterResumo(req, res, next) {
  try {
    const resumo = await dashboardService.obterResumo(req.user.perfil);
    res.status(200).json(resumo);
  } catch (err) {
    next(err);
  }
}

// Relatório em PDF com os mesmos indicadores do resumo (Sprint 5 — "Estatísticas+PDF")
async function gerarRelatorioPDF(req, res, next) {
  try {
    const pdfBuffer = await relatorioService.gerarRelatorioPDF(req.user.perfil);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-dashboard.pdf"');
    res.status(200).send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { obterResumo, gerarRelatorioPDF };
