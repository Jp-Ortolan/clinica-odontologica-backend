const morgan = require('morgan');

// Log inicial de requisições HTTP (método, rota, status, tempo de resposta).
// Em desenvolvimento usa o formato "dev" (colorido, mais legível no terminal).
// Em produção/homologação usa o formato "combined" (padrão de log de acesso,
// mais completo, melhor pra ler em arquivo/serviço de logs).
// Em ambiente de teste o log é desativado para não poluir a saída do Jest.
const formato = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

const logger = process.env.NODE_ENV === 'test' ? (req, res, next) => next() : morgan(formato);

module.exports = logger;
