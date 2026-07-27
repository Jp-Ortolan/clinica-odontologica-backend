const pool = require('../config/database');

async function listarPorCiclo(esterilizacaoId) {
  const { rows } = await pool.query(
    `SELECT cb.*, u.nome AS testado_por_nome
     FROM controle_biologico cb
     LEFT JOIN usuario u ON u.id = cb.testado_por_id
     WHERE cb.esterilizacao_id = $1
     ORDER BY cb.data_teste`,
    [esterilizacaoId]
  );
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    `SELECT cb.*, u.nome AS testado_por_nome
     FROM controle_biologico cb
     LEFT JOIN usuario u ON u.id = cb.testado_por_id
     WHERE cb.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function criar(dados) {
  const { esterilizacao_id, tipo, resultado = 'pendente', lote_indicador, testado_por_id, observacao } = dados;
  const { rows } = await pool.query(
    `INSERT INTO controle_biologico
       (esterilizacao_id, tipo, resultado, lote_indicador, testado_por_id, observacao)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [esterilizacao_id, tipo, resultado, lote_indicador, testado_por_id, observacao]
  );
  return rows[0];
}

async function atualizar(id, dados) {
  const { resultado, lote_indicador, observacao } = dados;
  const { rows } = await pool.query(
    `UPDATE controle_biologico SET
       resultado      = COALESCE($1, resultado),
       lote_indicador = COALESCE($2, lote_indicador),
       observacao     = COALESCE($3, observacao)
     WHERE id = $4
     RETURNING *`,
    [resultado, lote_indicador, observacao, id]
  );
  return rows[0] || null;
}

async function deletar(id) {
  const { rows } = await pool.query(
    'DELETE FROM controle_biologico WHERE id = $1 RETURNING id',
    [id]
  );
  return rows[0] || null;
}

module.exports = { listarPorCiclo, buscarPorId, criar, atualizar, deletar };
