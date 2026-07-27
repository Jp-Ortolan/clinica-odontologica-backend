// Queries SQL relacionadas à autenticação.

const pool = require('../config/database');

async function findByEmail(email) {
  const result = await pool.query(
    'SELECT * FROM usuario WHERE email = $1 AND ativo = true',
    [email]
  );
  return result.rows[0] || null;
}

async function salvarTokenRecuperacao(usuarioId, token, expiraEm) {
  await pool.query(
    'UPDATE usuario SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
    [token, expiraEm, usuarioId]
  );
}

async function findByResetToken(token) {
  const result = await pool.query(
    'SELECT * FROM usuario WHERE reset_token = $1 AND ativo = true',
    [token]
  );
  return result.rows[0] || null;
}

async function redefinirSenha(usuarioId, senhaHash) {
  await pool.query(
    'UPDATE usuario SET senha_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
    [senhaHash, usuarioId]
  );
}

module.exports = { findByEmail, salvarTokenRecuperacao, findByResetToken, redefinirSenha };
