// Gera um PDF com os mesmos indicadores do GET /api/dashboard/resumo,
// pronto pra imprimir ou anexar. Reaproveita o dashboardService pra não
// duplicar a regra de o que cada perfil pode ver.
//
// O layout usa as cores da identidade do app (azul #3B44A8 / âmbar #F9A814)
// em vez do texto corrido de antes, que saía como uma lista solta de
// "rótulo: número" sem hierarquia nenhuma.

const PDFDocument = require('pdfkit');
const dashboardService = require('./dashboardService');

const AZUL = '#3B44A8';
const AMBAR = '#F9A814';
const CINZA_TEXTO = '#4B5563';
const CINZA_CLARO = '#F3F4F6';
const CINZA_BORDA = '#E5E7EB';

const ROTULO_STATUS = {
  agendada: 'Agendadas',
  confirmada: 'Confirmadas',
  aguardando: 'Aguardando',
  em_atendimento: 'Em atendimento',
  realizada: 'Realizadas',
  cancelada: 'Canceladas',
  faltou: 'Faltas',
};

const ROTULO_PERFIL = {
  professor: 'Professor',
  aluno: 'Aluno',
  recepcionista: 'Recepção',
};

async function gerarRelatorioPDF(perfil) {
  const resumo = await dashboardService.obterResumo(perfil);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const larguraPagina = doc.page.width;
    const margem = 50;
    const larguraUtil = larguraPagina - margem * 2;

    // ── Cabeçalho ──────────────────────────────────────────────────────
    doc.rect(0, 0, larguraPagina, 110).fill(AZUL);

    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20)
      .text('Clínica Odontológica', margem, 34);

    doc.font('Helvetica').fontSize(11).fillColor('#C9CCEC')
      .text('Relatório de indicadores', margem, 60);

    // Faixa âmbar de assinatura visual
    doc.rect(0, 110, larguraPagina, 4).fill(AMBAR);

    const agora = new Date();
    doc.fillColor('#C9CCEC').fontSize(9)
      .text(
        `Emitido em ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        margem, 82, { width: larguraUtil, align: 'left' }
      )
      .text(`Perfil: ${ROTULO_PERFIL[perfil] || perfil}`, margem, 82, { width: larguraUtil, align: 'right' });

    let y = 150;

    // ── Cartões de indicadores ─────────────────────────────────────────
    const cartoes = [
      { titulo: 'Pacientes ativos', valor: resumo.pacientes_ativos },
      { titulo: 'Consultas hoje', valor: resumo.consultas_hoje },
      { titulo: 'Cirurgias hoje', valor: resumo.cirurgias_hoje },
    ];

    if (resumo.materiais_estoque_critico !== undefined) {
      cartoes.push(
        { titulo: 'Estoque crítico', valor: resumo.materiais_estoque_critico, alerta: resumo.materiais_estoque_critico > 0 },
        { titulo: 'Esterilizações pendentes', valor: resumo.esterilizacoes_pendentes }
      );
    }

    const porLinha = 3;
    const espaco = 14;
    const larguraCartao = (larguraUtil - espaco * (porLinha - 1)) / porLinha;
    const alturaCartao = 78;

    cartoes.forEach((cartao, i) => {
      const coluna = i % porLinha;
      const linhaIdx = Math.floor(i / porLinha);
      const x = margem + coluna * (larguraCartao + espaco);
      const topo = y + linhaIdx * (alturaCartao + espaco);

      doc.roundedRect(x, topo, larguraCartao, alturaCartao, 8)
        .fillAndStroke(CINZA_CLARO, CINZA_BORDA);

      doc.fillColor(cartao.alerta ? '#D32F2F' : AZUL).font('Helvetica-Bold').fontSize(26)
        .text(String(cartao.valor ?? 0), x, topo + 16, { width: larguraCartao, align: 'center' });

      doc.fillColor(CINZA_TEXTO).font('Helvetica').fontSize(8.5)
        .text(cartao.titulo.toUpperCase(), x + 6, topo + 52, {
          width: larguraCartao - 12, align: 'center', characterSpacing: 0.4,
        });
    });

    y += Math.ceil(cartoes.length / porLinha) * (alturaCartao + espaco) + 22;

    // ── Tabela: consultas de hoje por status ───────────────────────────
    doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(13)
      .text('Consultas de hoje por status', margem, y);
    y += 22;

    const linhas = resumo.consultas_hoje_por_status || [];

    if (linhas.length === 0) {
      doc.roundedRect(margem, y, larguraUtil, 42, 6).fillAndStroke('#FFFFFF', CINZA_BORDA);
      doc.fillColor('#9CA3AF').font('Helvetica').fontSize(10)
        .text('Nenhuma consulta registrada hoje.', margem, y + 16, { width: larguraUtil, align: 'center' });
      y += 60;
    } else {
      const alturaLinha = 26;

      // Cabeçalho da tabela
      doc.rect(margem, y, larguraUtil, alturaLinha).fill(AZUL);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9.5)
        .text('SITUAÇÃO', margem + 14, y + 8.5)
        .text('QUANTIDADE', margem, y + 8.5, { width: larguraUtil - 14, align: 'right' });
      y += alturaLinha;

      const totalConsultas = linhas.reduce((acc, l) => acc + Number(l.total || 0), 0);

      linhas.forEach((item, i) => {
        if (i % 2 === 1) doc.rect(margem, y, larguraUtil, alturaLinha).fill('#FAFAFA');

        doc.fillColor('#111827').font('Helvetica').fontSize(10)
          .text(ROTULO_STATUS[item.status] || item.status, margem + 14, y + 8);
        doc.font('Helvetica-Bold')
          .text(String(item.total), margem, y + 8, { width: larguraUtil - 14, align: 'right' });

        doc.moveTo(margem, y + alturaLinha).lineTo(margem + larguraUtil, y + alturaLinha)
          .strokeColor(CINZA_BORDA).lineWidth(0.5).stroke();
        y += alturaLinha;
      });

      // Total
      doc.rect(margem, y, larguraUtil, alturaLinha).fill(CINZA_CLARO);
      doc.fillColor(AZUL).font('Helvetica-Bold').fontSize(10)
        .text('Total', margem + 14, y + 8)
        .text(String(totalConsultas), margem, y + 8, { width: larguraUtil - 14, align: 'right' });
      y += alturaLinha + 26;
    }

    // ── Observação sobre o recorte dos dados ───────────────────────────
    doc.fillColor('#9CA3AF').font('Helvetica-Oblique').fontSize(8.5)
      .text(
        perfil === 'aluno'
          ? 'Indicadores de estoque e esterilização não são exibidos para o perfil Aluno.'
          : 'Os números refletem o momento da emissão deste relatório.',
        margem, y, { width: larguraUtil }
      );

    // ── Rodapé ─────────────────────────────────────────────────────────
    const rodapeY = doc.page.height - 52;
    doc.moveTo(margem, rodapeY).lineTo(margem + larguraUtil, rodapeY)
      .strokeColor(CINZA_BORDA).lineWidth(1).stroke();
    doc.fillColor('#9CA3AF').font('Helvetica').fontSize(8)
      .text('Clínica Odontológica — documento gerado automaticamente pelo sistema.',
        margem, rodapeY + 12, { width: larguraUtil, align: 'center' });

    doc.end();
  });
}

module.exports = { gerarRelatorioPDF };
