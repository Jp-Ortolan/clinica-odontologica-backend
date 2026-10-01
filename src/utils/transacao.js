// Executa várias operações de banco como uma coisa só: ou todas são
// gravadas, ou nenhuma é (COMMIT / ROLLBACK).
//
//   await transacao(async (db) => {
//     await repoA.algo(..., db);
//     await repoB.outraCoisa(..., db);
//   });
//
// Os repositories recebem `db` como último parâmetro opcional; sem ele,
// usam o pool normal (fora de transação).

const pool = require('../config/database');

async function transacao(trabalho) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await trabalho(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = transacao;
