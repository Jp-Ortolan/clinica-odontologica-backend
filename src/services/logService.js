// Service: log/auditoria
// Lê o arquivo de auditoria já gerado pelo Winston (src/utils/auditLogger.js)
// e devolve os eventos mais recentes por API — antes disso, os logs só
// existiam em arquivo (logs/audit.log), sem nenhuma rota para consultá-los.

const fs = require('fs');
const path = require('path');

const CAMINHO_AUDIT_LOG = path.join(__dirname, '..', '..', 'logs', 'audit.log');
const NIVEIS_VALIDOS = ['info', 'warn', 'error'];

function lerLinhas(caminho) {
  if (!fs.existsSync(caminho)) return [];
  const conteudo = fs.readFileSync(caminho, 'utf8');
  return conteudo
    .split('\n')
    .filter((linha) => linha.trim().length > 0)
    .map((linha) => {
      try {
        return JSON.parse(linha);
      } catch {
        return null; // ignora linhas corrompidas/incompletas
      }
    })
    .filter(Boolean);
}

async function listarAuditoria(filtros = {}) {
  const { nivel, limite } = filtros;

  if (nivel && !NIVEIS_VALIDOS.includes(nivel)) {
    throw { status: 400, message: `Nível inválido. Use um de: ${NIVEIS_VALIDOS.join(', ')}` };
  }

  const limiteNumero = limite ? Number(limite) : 100;
  if (Number.isNaN(limiteNumero) || limiteNumero <= 0) {
    throw { status: 400, message: 'Limite deve ser um número positivo' };
  }

  let eventos = lerLinhas(CAMINHO_AUDIT_LOG);
  if (nivel) eventos = eventos.filter((e) => e.level === nivel);

  // Mais recentes primeiro
  eventos.reverse();
  return eventos.slice(0, Math.min(limiteNumero, 500));
}

module.exports = { listarAuditoria };
