const morgan = require('morgan');

// Registra cada requisição (método, rota, status, tempo de resposta).
// Em desenvolvimento usa um formato colorido, mais fácil de ler no terminal.
// Em produção usa o formato padrão de log de acesso, melhor pra guardar em
// arquivo. Nos testes fica desligado, pra não poluir a saída do Jest.
const formato = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

const logger = process.env.NODE_ENV === 'test' ? (req, res, next) => next() : morgan(formato);

module.exports = logger;
