// Logs de eventos de negócio (ciclos criados, estoque crítico, controles
// reprovados etc.), diferente do logger.js que só loga requisições HTTP.
//
// Para onde vai cada evento:
// - tabela log_auditoria (fonte da tela "Logs"; sobrevive aos deploys)
// - console (o Railway guarda a saída do processo)
// - em desenvolvimento, também logs/audit.log e logs/error.log

const { createLogger, format, transports, Transport } = require('winston');
const path = require('path');
const fs = require('fs');

const emTeste = process.env.NODE_ENV === 'test';
const emProducao = process.env.NODE_ENV === 'production';

// Grava cada evento na tabela log_auditoria. Falha ao gravar NUNCA derruba
// a requisição: só aparece no console (e não chama o logger de novo, para
// não entrar em loop).
class BancoTransport extends Transport {
  log(info, callback) {
    setImmediate(() => this.emit('logged', info));
    const { level, message, timestamp, ...dados } = info;
    // require tardio: evita carregar o pool só por importar o logger
    require('../repositories/logRepository')
      .registrar(level, String(message), dados)
      .catch((err) => console.error('[auditoria] falha ao gravar no banco:', err.message))
      .finally(callback);
  }
}

const auditLogger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  silent: emTeste,
  transports: emTeste ? [new transports.Console()] : [new BancoTransport()],
});

if (emProducao) {
  auditLogger.add(new transports.Console());
} else if (!emTeste) {
  const logsDir = path.join(__dirname, '..', '..', 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
  auditLogger.add(new transports.File({
    filename: path.join(logsDir, 'audit.log'), maxsize: 5 * 1024 * 1024, maxFiles: 5,
  }));
  auditLogger.add(new transports.File({
    filename: path.join(logsDir, 'error.log'), level: 'error', maxsize: 5 * 1024 * 1024, maxFiles: 3,
  }));
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
