// Repository: auth
// Queries SQL relacionadas à autenticação

const pool = require('../config/database');

async function findByEmail(email) {
  const result = await pool.query(
    'SELECT * FROM usuario WHERE email = $1 AND ativo = true',
    [email]
  );
  return result.rows[0] || null;
}

module.exports = { findByEmail };
