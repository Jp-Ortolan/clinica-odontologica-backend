// Queries SQL da tabela log_auditoria.

const pool = require('../config/database');

async function registrar(nivel, mensagem, dados) {
  await pool.query(
    'INSERT INTO log_auditoria (nivel, mensagem, dados) VALUES ($1, $2, $3)',
    [nivel, mensagem, dados && Object.keys(dados).length ? dados : null]
  );
}

// Devolve no mesmo formato que a tela de Logs já usava (o do Winston):
// { level, message, timestamp: 'AAAA-MM-DD HH:MM:SS', ...dados }
async function listar({ nivel, limite }) {
  const result = await pool.query(
    `SELECT nivel, mensagem, dados,
            to_char(criado_em AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI:SS') AS timestamp
     FROM log_auditoria
     WHERE ($1::text IS NULL OR nivel = $1)
     ORDER BY id DESC
     LIMIT $2`,
    [nivel || null, limite]
  );
  return result.rows.map((r) => ({
    ...(r.dados || {}),
    level: r.nivel,
    message: r.mensagem,
    timestamp: r.timestamp,
  }));
}

module.exports = { registrar, listar };
