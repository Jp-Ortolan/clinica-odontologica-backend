const { Pool } = require('pg');

// Em produção/homologação (ex.: Render) a conexão com o Postgres exige SSL.
// Em desenvolvimento local (docker-compose / Postgres local) isso fica desligado.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
