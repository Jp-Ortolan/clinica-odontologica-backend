// Queries SQL da tabela categoria.

const pool = require('../config/database');

async function listar() {
  const result = await pool.query('SELECT * FROM categoria ORDER BY nome ASC');
  return result.rows;
}

async function buscarPorId(id) {
  const result = await pool.query('SELECT * FROM categoria WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function buscarPorNome(nome) {
  const result = await pool.query(
    'SELECT * FROM categoria WHERE lower(nome) = lower($1)',
    [nome]
  );
  return result.rows[0] || null;
}

async function criar(dados) {
  const { nome } = dados;
  const result = await pool.query(
    'INSERT INTO categoria (nome) VALUES ($1) RETURNING *',
    [nome]
  );
  return result.rows[0];
}

async function atualizar(id, dados) {
  const { nome } = dados;
  const result = await pool.query(
    'UPDATE categoria SET nome = $1 WHERE id = $2 RETURNING *',
    [nome, id]
  );
  return result.rows[0] || null;
}

async function deletar(id) {
  const result = await pool.query(
    'DELETE FROM categoria WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0] || null;
}

async function contarMateriaisVinculados(id) {
  const result = await pool.query(
    'SELECT COUNT(*)::int AS total FROM material WHERE categoria_id = $1',
    [id]
  );
  return result.rows[0].total;
}

module.exports = {
  listar,
  buscarPorId,
  buscarPorNome,
  criar,
  atualizar,
  deletar,
  contarMateriaisVinculados,
};
