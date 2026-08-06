// Queries SQL da tabela usuario.

const pool = require('../config/database');

// Nunca devolve senha_hash pra fora do repository.
const COLUNAS_SEGURAS = 'id, nome, cpf, email, telefone, setor, perfil, data_admissao, ativo, criado_em';

async function listar(filtros = {}) {
  const condicoes = [];
  const valores = [];

  if (typeof filtros.ativo === 'boolean') {
    valores.push(filtros.ativo);
    condicoes.push(`ativo = $${valores.length}`);
  }
  if (filtros.perfil) {
    valores.push(filtros.perfil);
    condicoes.push(`perfil = $${valores.length}`);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT ${COLUNAS_SEGURAS} FROM usuario ${where} ORDER BY nome ASC`,
    valores
  );
  return result.rows;
}

async function buscarPorId(id) {
  const result = await pool.query(
    `SELECT ${COLUNAS_SEGURAS} FROM usuario WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function buscarPorEmail(email) {
  const result = await pool.query('SELECT id FROM usuario WHERE email = $1', [email]);
  return result.rows[0] || null;
}

async function buscarPorCpf(cpf) {
  const result = await pool.query('SELECT id FROM usuario WHERE cpf = $1', [cpf]);
  return result.rows[0] || null;
}

async function criar(dados) {
  const { nome, cpf, email, senha_hash, telefone, setor, perfil, data_admissao, ativo } = dados;
  // "ativo" era fixo em true no INSERT: a tela de cadastro tinha um campo
  // "Status" obrigatório que não surtia efeito nenhum — criar alguém já
  // inativo era impossível.
  const result = await pool.query(
    `INSERT INTO usuario (nome, cpf, email, senha_hash, telefone, setor, perfil, data_admissao, ativo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${COLUNAS_SEGURAS}`,
    [nome, cpf, email, senha_hash, telefone ?? null, setor ?? null, perfil, data_admissao ?? null, ativo ?? true]
  );
  return result.rows[0];
}

async function atualizar(id, dados) {
  const { nome, cpf, email, telefone, setor, perfil, data_admissao, ativo, senha_hash } = dados;
  const result = await pool.query(
    `UPDATE usuario
     SET nome = $1, cpf = $2, email = $3, telefone = $4, setor = $5, perfil = $6,
         data_admissao = $7, ativo = $8, senha_hash = COALESCE($9, senha_hash)
     WHERE id = $10
     RETURNING ${COLUNAS_SEGURAS}`,
    [nome, cpf, email, telefone, setor, perfil, data_admissao, ativo, senha_hash ?? null, id]
  );
  return result.rows[0] || null;
}

async function deletar(id) {
  const result = await pool.query('DELETE FROM usuario WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
}

module.exports = { listar, buscarPorId, buscarPorEmail, buscarPorCpf, criar, atualizar, deletar };
