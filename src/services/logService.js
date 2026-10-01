// Eventos de auditoria para a tela "Logs/Auditoria" (GET /api/logs).
// Lidos da tabela log_auditoria — o arquivo logs/audit.log some a cada
// deploy no Railway, a tabela não.

const logRepository = require('../repositories/logRepository');

const NIVEIS_VALIDOS = ['info', 'warn', 'error'];
const LIMITE_PADRAO = 100;
const LIMITE_MAXIMO = 500;

async function listarAuditoria(filtros = {}) {
  const { nivel, limite } = filtros;

  if (nivel && !NIVEIS_VALIDOS.includes(nivel)) {
    throw { status: 400, message: `Nível inválido. Use um de: ${NIVEIS_VALIDOS.join(', ')}` };
  }

  const limiteNumero = limite ? Number(limite) : LIMITE_PADRAO;
  if (!Number.isInteger(limiteNumero) || limiteNumero <= 0) {
    throw { status: 400, message: 'Limite deve ser um número inteiro positivo' };
  }

  return logRepository.listar({ nivel, limite: Math.min(limiteNumero, LIMITE_MAXIMO) });
}

module.exports = { listarAuditoria };
