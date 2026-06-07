// Script para criar usuário professor (acesso total) de teste
// Execute: node scripts/seed-admin.js

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../src/config/database');

async function seedProfessor() {
  const senha = 'professor123';
  const senhaHash = await bcrypt.hash(senha, 10);

  const query = `
    INSERT INTO usuario (nome, cpf, email, senha_hash, telefone, setor, perfil, data_admissao, ativo)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (email) DO NOTHING
    RETURNING id, nome, email, perfil;
  `;

  const values = [
    'Professor',
    '00000000000',
    'professor@clinica.com',
    senhaHash,
    '(41) 99999-0000',
    'Administração',
    'professor',
    '2026-01-01',
    true,
  ];

  try {
    const result = await pool.query(query, values);
    if (result.rows.length > 0) {
      console.log('Usuário professor criado com sucesso:');
      console.log(result.rows[0]);
      console.log('\nCredenciais para teste:');
      console.log('  Email: professor@clinica.com');
      console.log('  Senha: professor123');
    } else {
      console.log('Usuário professor já existe, nada foi alterado.');
    }
  } catch (err) {
    console.error('Erro ao criar usuário professor:', err.message);
  } finally {
    await pool.end();
  }
}

seedProfessor();
