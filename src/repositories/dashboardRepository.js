// Repository: dashboard
// Consultas agregadas (contagens) para as telas de Dashboard do
// protótipo. Escopo da Sprint 5 — resumo numérico; gráficos/PDF ficam
// para uma iteração futura (ver Backlog_Prototipo_vs_Backend.docx).

const pool = require('../config/database');

async function contarPacientesAtivos() {
  const r = await pool.query('SELECT COUNT(*)::int AS total FROM paciente WHERE ativo = true');
  return r.rows[0].total;
}

async function contarConsultasHoje() {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS total FROM consulta WHERE data_hora::date = CURRENT_DATE`
  );
  return r.rows[0].total;
}

async function contarConsultasPorStatusHoje() {
  const r = await pool.query(
    `SELECT status, COUNT(*)::int AS total FROM consulta
     WHERE data_hora::date = CURRENT_DATE GROUP BY status`
  );
  return r.rows;
}

async function contarCirurgiasHoje() {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS total FROM cirurgia WHERE data_hora::date = CURRENT_DATE`
  );
  return r.rows[0].total;
}

async function contarMateriaisEstoqueCritico() {
  const r = await pool.query(
    'SELECT COUNT(*)::int AS total FROM material WHERE quantidade <= estoque_minimo'
  );
  return r.rows[0].total;
}

async function contarEsterilizacoesPendentes() {
  const r = await pool.query(
    "SELECT COUNT(*)::int AS total FROM esterilizacao WHERE status = 'pendente' OR status IS NULL"
  );
  return r.rows[0].total;
}

module.exports = {
  contarPacientesAtivos,
  contarConsultasHoje,
  contarConsultasPorStatusHoje,
  contarCirurgiasHoje,
  contarMateriaisEstoqueCritico,
  contarEsterilizacoesPendentes,
};
