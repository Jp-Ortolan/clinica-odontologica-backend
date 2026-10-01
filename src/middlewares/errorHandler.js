// Tratamento central de erros.
//
// - Erros de negócio (lançados pelos services como { status, message })
//   chegam ao front com a mensagem original.
// - Erros conhecidos do PostgreSQL viram respostas 4xx com texto amigável.
// - Qualquer outro erro vira 500 com mensagem genérica: detalhes internos
//   (SQL, nomes de tabela, stack) ficam só no log do servidor.

const auditLogger = require('../utils/auditLogger');

const ERROS_POSTGRES = {
  23505: { status: 409, message: 'Registro duplicado: já existe um cadastro com esses dados' },
  23503: { status: 409, message: 'Operação não permitida: o registro está vinculado a outros dados' },
  23514: { status: 400, message: 'Valor não permitido para um dos campos' },
  23502: { status: 400, message: 'Campo obrigatório não informado' },
  '22P02': { status: 400, message: 'Formato de dado inválido' },
  22007: { status: 400, message: 'Data em formato inválido' },
  22008: { status: 400, message: 'Data fora do intervalo permitido' },
  22001: { status: 400, message: 'Texto maior do que o permitido para o campo' },
};

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  // JSON malformado ou corpo grande demais (express.json)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON inválido no corpo da requisição' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Arquivo ou conteúdo grande demais' });
  }

  const erroPostgres = err.code && ERROS_POSTGRES[err.code];
  if (erroPostgres) {
    return res.status(erroPostgres.status).json({ message: erroPostgres.message });
  }

  const status = Number(err.status) || 500;
  if (status < 500) {
    return res.status(status).json({ message: err.message || 'Requisição inválida' });
  }

  auditLogger.error('Erro interno', {
    metodo: req.method,
    rota: req.originalUrl,
    erro: err.message,
    stack: err.stack,
  });
  return res.status(500).json({ message: 'Erro interno do servidor' });
};
