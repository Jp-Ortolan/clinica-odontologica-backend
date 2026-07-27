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

// Mesmos números do resumo, só que formatados em PDF pra imprimir/anexar.
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
