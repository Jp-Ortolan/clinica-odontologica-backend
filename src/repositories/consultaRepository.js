// Repository: consulta
// Responsável por todas as queries SQL da tabela consulta

const pool = require('../config/database');

async function listar(filtros = {}) {
  const condicoes = [];
  const valores = [];

  if (filtros.status) {
    valores.push(filtros.status);
    condicoes.push(`status = $${valores.length}`);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM consulta ${where} ORDER BY data_hora DESC`,
    valores
  );
  return result.rows;
}

async function buscarPorId(id) {
  const result = await pool.query(
    'SELECT * FROM consulta WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function criar(dados) {
  const { paciente_id, usuario_id, data_hora, queixa_principal, observacoes, status } = dados;
  const result = await pool.query(
    `INSERT INTO consulta (paciente_id, usuario_id, data_hora, queixa_principal, observacoes, status)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'agendada'))
     RETURNING *`,
    [paciente_id, usuario_id, data_hora, queixa_principal, observacoes, status]
  );
  return result.rows[0];
}

async function atualizar(id, dados) {
  const { paciente_id, usuario_id, data_hora, queixa_principal, observacoes, status } = dados;
  const result = await pool.query(
    `UPDATE consulta
     SET paciente_id = $1, usuario_id = $2, data_hora = $3, queixa_principal = $4, observacoes = $5, status = $6
     WHERE id = $7
     RETURNING *`,
    [paciente_id, usuario_id, data_hora, queixa_principal, observacoes, status, id]
  );
  return result.rows[0] || null;
}

async function deletar(id) {
  const result = await pool.query(
    'DELETE FROM consulta WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };
