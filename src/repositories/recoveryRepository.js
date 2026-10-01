const pool = require('../config/database');

async function reservarCodigo(id, digest) {
  const result = await pool.query(
    `UPDATE usuario SET reset_token = $2, reset_token_expires = NOW() + INTERVAL '10 minutes',
       reset_attempts = 0, reset_requested_at = NOW()
     WHERE id = $1 AND ativo = true
       AND (reset_requested_at IS NULL OR reset_requested_at < NOW() - INTERVAL '60 seconds')
     RETURNING id`, [id, digest]);
  return result.rowCount > 0;
}

async function invalidarCodigo(id, digest) {
  await pool.query('UPDATE usuario SET reset_token = NULL, reset_token_expires = NULL WHERE id = $1 AND reset_token = $2', [id, digest]);
}

async function consumirCodigo(email, digest, senhaHash) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, reset_token, reset_attempts,
         (reset_token_expires > NOW()) AS valido
       FROM usuario WHERE email = $1 AND ativo = true FOR UPDATE`, [email]);
    const usuario = rows[0];
    if (!usuario || !usuario.reset_token || !usuario.valido || usuario.reset_attempts >= 5) {
      await client.query('COMMIT');
      return false;
    }
    if (usuario.reset_token !== digest) {
      await client.query('UPDATE usuario SET reset_attempts = reset_attempts + 1 WHERE id = $1', [usuario.id]);
      await client.query('COMMIT');
      return false;
    }
    await client.query(
      `UPDATE usuario SET senha_hash = $2, reset_token = NULL,
       reset_token_expires = NULL, reset_attempts = 0 WHERE id = $1`, [usuario.id, senhaHash]);
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { reservarCodigo, invalidarCodigo, consumirCodigo };
