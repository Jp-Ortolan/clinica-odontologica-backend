// Cria o primeiro usuário coordenador (acesso total) num banco novo.
//
// A senha NÃO fica no código: informe pelas variáveis de ambiente.
//   SEED_ADMIN_EMAIL=coordenacao@clinica.com SEED_ADMIN_SENHA='...' node scripts/seed-admin.js
// Se o e-mail já existir, nada é alterado.

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../src/config/database');

const SENHA_MINIMA = 10;

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const senha = process.env.SEED_ADMIN_SENHA;

  if (!email || !senha) {
    console.error('Defina SEED_ADMIN_EMAIL e SEED_ADMIN_SENHA antes de rodar este script.');
    process.exitCode = 1;
    return;
  }
  if (senha.length < SENHA_MINIMA) {
    console.error(`SEED_ADMIN_SENHA precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
    process.exitCode = 1;
    return;
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  try {
    const result = await pool.query(
      `INSERT INTO usuario (nome, cpf, email, senha_hash, setor, perfil, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, nome, email, perfil`,
      [process.env.SEED_ADMIN_NOME || 'Coordenação', process.env.SEED_ADMIN_CPF || '00000000000',
        email, senhaHash, 'Administração', 'coordenador']
    );
    console.log(result.rows.length
      ? `Usuário criado: ${result.rows[0].email} (${result.rows[0].perfil})`
      : 'Esse e-mail já existe; nada foi alterado.');
  } catch (err) {
    console.error('Erro ao criar o usuário:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedAdmin();
