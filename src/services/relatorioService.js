// Gera um PDF com os mesmos indicadores do GET /api/dashboard/resumo,
// prontos pra imprimir ou anexar. Reaproveita o dashboardService pra não
// duplicar a regra de o que cada perfil pode ver.

const PDFDocument = require('pdfkit');
const dashboardService = require('./dashboardService');

async function gerarRelatorioPDF(perfil) {
  const resumo = await dashboardService.obterResumo(perfil);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    doc.fontSize(18).text('Clínica Odontológica — Relatório de Indicadores', { align: 'center' });
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor('#555555')
      .text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
    doc.moveDown(1.5);
    doc.fillColor('#000000');

    linha(doc, 'Pacientes ativos', resumo.pacientes_ativos);
    linha(doc, 'Consultas hoje', resumo.consultas_hoje);

    doc.moveDown(0.5);
    doc.fontSize(12).text('Consultas de hoje por status:');
    if (resumo.consultas_hoje_por_status.length === 0) {
      doc.fontSize(11).text('  Nenhuma consulta registrada hoje.');
    } else {
      resumo.consultas_hoje_por_status.forEach((item) => {
        doc.fontSize(11).text(`  • ${item.status}: ${item.total}`);
      });
    }

    doc.moveDown(0.5);
    linha(doc, 'Cirurgias hoje', resumo.cirurgias_hoje);

    // Estoque/esterilização só aparecem para quem o dashboardService já
    // decidiu que pode ver (omitido para o perfil aluno).
    if (resumo.materiais_estoque_critico !== undefined) {
      doc.moveDown(0.5);
      linha(doc, 'Materiais em estoque crítico', resumo.materiais_estoque_critico);
      linha(doc, 'Esterilizações pendentes', resumo.esterilizacoes_pendentes);
    }

    doc.end();
  });
}

function linha(doc, label, valor) {
  doc
    .fontSize(12)
    .text(`${label}: `, { continued: true })
    .font('Helvetica-Bold')
    .text(`${valor}`)
    .font('Helvetica');
}

module.exports = { gerarRelatorioPDF };
