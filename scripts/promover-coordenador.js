require('dotenv').config();
const pool = require('../src/config/database');

async function executar() {
  const email = process.env.COORDENADOR_EMAIL;
  if (!email) throw new Error('Defina COORDENADOR_EMAIL com a conta autorizada para coordenar.');
  const resultado = await pool.query(
    "UPDATE usuario SET perfil = 'coordenador' WHERE lower(email) = lower($1) AND ativo = true RETURNING id",
    [email]
  );
  if (resultado.rowCount !== 1) throw new Error('Não foi encontrada uma conta ativa com esse e-mail.');
  console.log('Conta promovida a coordenador. Faça login novamente para atualizar a sessão.');
}

executar().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
