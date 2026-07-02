// Aplica as migrations (migrations/*.sql) em ordem no banco apontado por DATABASE_URL.
// Usado no deploy de homologação (Render), mas funciona em qualquer ambiente.
//
// Controla o que já foi aplicado numa tabela "_migrations", então pode ser
// executado várias vezes sem repetir migration já aplicada.
//
// Execute: node scripts/migrate.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

const PASTA_MIGRATIONS = path.join(__dirname, '..', 'migrations');

async function garantirTabelaControle(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      nome_arquivo TEXT PRIMARY KEY,
      aplicada_em TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

async function migrationsJaAplicadas(client) {
  const result = await client.query('SELECT nome_arquivo FROM _migrations;');
  return new Set(result.rows.map((r) => r.nome_arquivo));
}

async function migrar() {
  const client = await pool.connect();

  try {
    await garantirTabelaControle(client);
    const aplicadas = await migrationsJaAplicadas(client);

    const arquivos = fs
      .readdirSync(PASTA_MIGRATIONS)
      .filter((nome) => nome.endsWith('.sql'))
      .sort(); // 001_..., 002_..., 003_... — ordem alfabética/numérica

    if (arquivos.length === 0) {
      console.log('Nenhum arquivo de migration encontrado em migrations/.');
      return;
    }

    for (const arquivo of arquivos) {
      if (aplicadas.has(arquivo)) {
        console.log(`(ok) ${arquivo} já aplicada, pulando.`);
        continue;
      }

      const caminho = path.join(PASTA_MIGRATIONS, arquivo);
      const sql = fs.readFileSync(caminho, 'utf8');

      console.log(`Aplicando ${arquivo}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (nome_arquivo) VALUES ($1);', [arquivo]);
        await client.query('COMMIT');
        console.log(`  -> ${arquivo} aplicada com sucesso.`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Falha ao aplicar ${arquivo}: ${err.message}`);
      }
    }

    console.log('Migrations concluídas.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrar().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
