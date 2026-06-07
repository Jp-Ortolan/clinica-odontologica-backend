require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET', 'PORT'];
required.forEach((key) => {
  if (!process.env[key]) throw new Error(`Variável de ambiente ausente: ${key}`);
});

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET,
  databaseUrl: process.env.DATABASE_URL,
};
