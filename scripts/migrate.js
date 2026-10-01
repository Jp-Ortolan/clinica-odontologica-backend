// Aplica as migrations (migrations/*.sql) em ordem no banco de DATABASE_URL.
// Roda automaticamente antes de a API subir (ver Dockerfile).
//
// Controle em _migrations:
// - nome_arquivo: o que já foi aplicado é pulado (o nome precisa ser
//   EXATAMENTE o registrado no banco — por isso nunca renomeie uma migration);
// - checksum: resumo SHA-256 do arquivo. Se uma migration já aplicada for
//   editada depois, o deploy para com erro, em vez de seguir com o banco
//   diferente do código. Migrations aplicadas antes desta checagem têm o
//   checksum preenchido na primeira execução.
//
// Cada arquivo roda numa transação própria: ou entra inteiro, ou nada.
//
// Execute: npm run migrate

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../src/config/database');

const PASTA_MIGRATIONS = path.join(__dirname, '..', 'migrations');

function checksum(conteudo) {
  // Normaliza quebras de linha: o mesmo arquivo no Windows (CRLF) e no
  // Linux (LF) precisa gerar o mesmo resumo.
  return crypto.createHash('sha256').update(conteudo.replace(/\r\n/g, '\n')).digest('hex');
}

async function garantirTabelaControle(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      nome_arquivo TEXT PRIMARY KEY,
      aplicada_em TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await client.query('ALTER TABLE _migrations ADD COLUMN IF NOT EXISTS checksum TEXT;');
}

async function migrar() {
  const client = await pool.connect();

  try {
    await garantirTabelaControle(client);
    const { rows } = await client.query('SELECT nome_arquivo, checksum FROM _migrations;');
    const aplicadas = new Map(rows.map((r) => [r.nome_arquivo, r.checksum]));

    const arquivos = fs
      .readdirSync(PASTA_MIGRATIONS)
      .filter((nome) => nome.endsWith('.sql'))
      .sort(); // 001_..., 002_..., 003_... — ordem alfabética/numérica

    // Duas migrations com o mesmo número costumam ser conflito de branches.
    const numeros = arquivos.map((a) => a.split('_')[0]);
    const repetidos = numeros.filter((n, i) => numeros.indexOf(n) !== i);
    if (repetidos.length) {
      throw new Error(`Há migrations com número repetido: ${[...new Set(repetidos)].join(', ')}`);
    }

    // 1ª passada: confere as já aplicadas ANTES de aplicar qualquer coisa nova.
    const pendentes = [];
    const alteradas = [];
    for (const arquivo of arquivos) {
      const sql = fs.readFileSync(path.join(PASTA_MIGRATIONS, arquivo), 'utf8');
      const resumo = checksum(sql);
      if (!aplicadas.has(arquivo)) {
        pendentes.push({ arquivo, sql, resumo });
      } else if (!aplicadas.get(arquivo)) {
        await client.query('UPDATE _migrations SET checksum = $1 WHERE nome_arquivo = $2;', [resumo, arquivo]);
      } else if (aplicadas.get(arquivo) !== resumo) {
        alteradas.push(arquivo);
      }
    }

    if (alteradas.length) {
      throw new Error(
        `Migrations já aplicadas foram editadas depois: ${alteradas.join(', ')}. `
        + 'Desfaça a edição e crie uma migration nova com a mudança.'
      );
    }

    // 2ª passada: aplica as pendentes, cada uma na sua transação.
    let aplicadasAgora = 0;
    for (const { arquivo, sql, resumo } of pendentes) {
      console.log(`Aplicando ${arquivo}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (nome_arquivo, checksum) VALUES ($1, $2);',
          [arquivo, resumo]
        );
        await client.query('COMMIT');
        aplicadasAgora += 1;
        console.log(`  -> ${arquivo} aplicada com sucesso.`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Falha ao aplicar ${arquivo}: ${err.message}`);
      }
    }

    console.log(aplicadasAgora ? `Migrations concluídas (${aplicadasAgora} nova(s)).` : 'Banco já atualizado.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrar().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
