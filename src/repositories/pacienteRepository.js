// Repository: paciente
// Responsável por todas as queries SQL da tabela paciente

const pool = require('../config/database');

async function listar() {
  const result = await pool.query(
    'SELECT * FROM paciente ORDER BY nome ASC'
  );
  return result.rows;
}

async function buscarPorId(id) {
  const result = await pool.query(
    'SELECT * FROM paciente WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function buscarPorCpf(cpf) {
  const result = await pool.query(
    'SELECT * FROM paciente WHERE cpf = $1',
    [cpf]
  );
  return result.rows[0] || null;
}

async function criar(dados) {
  const { nome, cpf, data_nascimento, telefone, email, endereco } = dados;
  const result = await pool.query(
    `INSERT INTO paciente (nome, cpf, data_nascimento, telefone, email, endereco)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [nome, cpf, data_nascimento, telefone, email, endereco]
  );
  return result.rows[0];
}

async function atualizar(id, dados) {
  const { nome, cpf, data_nascimento, telefone, email, endereco } = dados;
  const result = await pool.query(
    `UPDATE paciente
     SET nome = $1, cpf = $2, data_nascimento = $3, telefone = $4, email = $5, endereco = $6
     WHERE id = $7
     RETURNING *`,
    [nome, cpf, data_nascimento, telefone, email, endereco, id]
  );
  return result.rows[0] || null;
}

async function deletar(id) {
  const result = await pool.query(
    'DELETE FROM paciente WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { listar, buscarPorId, buscarPorCpf, criar, atualizar, deletar };
