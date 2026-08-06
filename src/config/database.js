const { Pool, types } = require('pg');

// ── Fuso horário das datas ──────────────────────────────────────────────
//
// As colunas de data/hora do sistema são "timestamp without time zone", ou
// seja, guardam a hora local da clínica sem nenhuma informação de fuso.
// O driver `pg`, por padrão, converte esse valor para um objeto Date usando
// o fuso do SERVIDOR — e o servidor de produção (Railway) roda em UTC.
//
// O efeito: uma consulta gravada como "2026-08-07 15:00" virava
// Date(2026-08-07T15:00Z) e chegava no navegador como "2026-08-07T15:00:00.000Z".
// O front, em Brasília (UTC-3), exibia 12:00 — três horas a menos do que a
// recepção tinha digitado. Era isso que fazia o reagendamento "puxar um
// horário diferente depois de salvo".
//
// Como a coluna não tem fuso, o certo é não inventar um: devolvemos a data
// como string ISO **sem** o sufixo Z. Assim `new Date(valor)` no navegador
// interpreta como hora local e mostra exatamente o que foi gravado, em
// qualquer fuso onde o servidor esteja rodando.
const OID_TIMESTAMP_SEM_FUSO = 1114;
const OID_DATE = 1082;

types.setTypeParser(OID_TIMESTAMP_SEM_FUSO, (valor) => {
  if (!valor) return valor;
  // "2026-08-07 15:00:00" ou "2026-08-07 15:00:00.123" → "2026-08-07T15:00:00"
  return valor.replace(' ', 'T').split('.')[0];
});

// DATE puro (validade, data_entrada, data_evento) também não deve ganhar
// fuso: senão "2026-08-07" vira 06/08 à noite em quem está a oeste de UTC.
types.setTypeParser(OID_DATE, (valor) => valor);

// Em produção/homologação (ex.: Railway) a conexão com o Postgres exige SSL.
// Em desenvolvimento local (docker-compose / Postgres local) isso fica desligado.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
