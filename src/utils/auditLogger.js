// auditLogger.js — Logs de negócio/auditoria (Winston)
// Registra eventos importantes da aplicação em arquivo e console.
//
// Diferente do logger.js (Morgan, que loga requisições HTTP),
// este captura eventos de negócio: ciclos criados, estoques críticos,
// controles reprovados, etc.
//
// Arquivos de log gerados em logs/:
//   - logs/audit.log   → todos os eventos de auditoria
//   - logs/error.log   → apenas erros

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs   = require('fs');

// garante que a pasta logs/ existe (criada em runtime, não versionada)
const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

const auditLogger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  silent: process.env.NODE_ENV === 'test', // silencia durante testes
  transports: [
    // arquivo com todos os eventos de auditoria
    new transports.File({
      filename: path.join(logsDir, 'audit.log'),
      maxsize: 5 * 1024 * 1024, // 5 MB — rotaciona automaticamente
      maxFiles: 5,
    }),
    // arquivo separado só para erros
    new transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
    }),
  ],
});

// em desenvolvimento também exibe no console (colorido)
if (process.env.NODE_ENV !== 'production') {
  auditLogger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.printf(({ timestamp, level, message, ...meta }) => {
        const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}] ${message}${extras}`;
      })
    ),
  }));
}

module.exports = auditLogger;
