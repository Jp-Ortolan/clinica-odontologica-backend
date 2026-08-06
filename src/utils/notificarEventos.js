// Quem recebe qual notificação.
//
// Este arquivo existe pra deixar a regra num lugar só, em vez de espalhada
// pelos services. Cada função abaixo representa UM evento do sistema e diz
// explicitamente quais perfis são avisados — a decisão é de negócio, não
// técnica, então fica documentada aqui.
//
// Princípio geral: a pessoa só é avisada do que ela pode agir.
//
//   ┌──────────────────────────────┬───────────┬───────┬───────────────┐
//   │ Evento                       │ professor │ aluno │ recepcionista │
//   ├──────────────────────────────┼───────────┼───────┼───────────────┤
//   │ Estoque baixo / crítico      │     x     │   x   │       -       │  ← recepção não mexe no estoque
//   │ Material vencendo            │     x     │   x   │       -       │
//   │ Falha no controle biológico  │     x     │   x   │       -       │  ← CME é clínico
//   │ Consulta agendada/remarcada  │  responsável da consulta  │   -   │  ← quem atende
//   │ Consulta cancelada           │  responsável  +  recepção         │  ← recepção reorganiza a agenda
//   │ Cirurgia agendada            │     x     │ vinculados │    -     │
//   └──────────────────────────────┴───────────┴───────┴───────────────┘

const notificacaoRepository = require('../repositories/notificacaoRepository');
const auditLogger = require('./auditLogger');

// Perfis que cuidam da parte clínica/estoque. A recepção fica de fora
// de propósito: ela não repõe material nem opera o CME.
const PERFIS_CLINICOS = ['professor', 'aluno'];

// Notificação nunca pode derrubar a operação principal. Se falhar, vira
// log e a requisição segue normalmente.
async function enviarSeguro(fn, contexto) {
  try {
    return await fn();
  } catch (err) {
    auditLogger.warn('Falha ao gerar notificação', { contexto, erro: err.message });
    return null;
  }
}

async function paraUsuario(usuarioId, dados) {
  if (!usuarioId) return null;
  return enviarSeguro(
    () => notificacaoRepository.criar({ ...dados, usuario_id: usuarioId }),
    dados.titulo
  );
}

async function paraPerfis(perfis, dados) {
  return enviarSeguro(async () => {
    const listas = await Promise.all(perfis.map((p) => notificacaoRepository.listarIdsUsuariosPorPerfil(p)));
    const ids = [...new Set(listas.flat())];
    return Promise.all(ids.map((usuario_id) => notificacaoRepository.criar({ ...dados, usuario_id })));
  }, dados.titulo);
}

// ── Estoque ────────────────────────────────────────────────────────────
// Só professor e aluno. A recepção não tem nem acesso à tela de estoque
// (ver materialRoutes: autorizar('professor', 'aluno')), então avisá-la
// seria mandar a pessoa para uma tela que ela não pode abrir.

async function estoqueBaixo(material) {
  const critico = material.quantidade <= material.estoque_minimo;
  return paraPerfis(PERFIS_CLINICOS, {
    titulo: critico ? 'Estoque crítico' : 'Estoque baixo',
    mensagem: `${material.nome}: ${material.quantidade} ${material.unidade_medida || 'un'} restantes (mínimo: ${material.estoque_minimo})`,
    tipo: 'estoque',
    referencia_id: material.id,
  });
}

async function materialVencendo(material, diasRestantes) {
  return paraPerfis(PERFIS_CLINICOS, {
    titulo: diasRestantes <= 0 ? 'Material vencido' : 'Material perto do vencimento',
    mensagem: diasRestantes <= 0
      ? `${material.nome} venceu em ${new Date(material.validade).toLocaleDateString('pt-BR')}`
      : `${material.nome} vence em ${diasRestantes} dia(s)`,
    tipo: 'estoque',
    referencia_id: material.id,
  });
}

// ── CME / esterilização ────────────────────────────────────────────────

async function controleBiologicoPositivo(cicloId, resultado) {
  return paraPerfis(PERFIS_CLINICOS, {
    titulo: 'Falha no controle biológico',
    mensagem: `O ciclo #${cicloId} teve resultado "${resultado}". Os pacotes desse ciclo não devem ser usados.`,
    tipo: 'cme',
    referencia_id: cicloId,
  });
}

// ── Consultas ──────────────────────────────────────────────────────────
// Vão para o profissional responsável pelo atendimento. A recepção só é
// avisada de cancelamento, porque é ela quem remaneja a agenda.

async function consultaAgendada(usuarioResponsavelId, { pacienteNome, quandoFormatado, consultaId }) {
  return paraUsuario(usuarioResponsavelId, {
    titulo: 'Nova consulta agendada',
    mensagem: `${pacienteNome} — ${quandoFormatado}`,
    tipo: 'consulta',
    referencia_id: consultaId,
  });
}

async function consultaReagendada(usuarioResponsavelId, { quandoFormatado, consultaId }) {
  return paraUsuario(usuarioResponsavelId, {
    titulo: 'Consulta reagendada',
    mensagem: `Novo horário: ${quandoFormatado}`,
    tipo: 'consulta',
    referencia_id: consultaId,
  });
}

async function consultaCancelada(usuarioResponsavelId, { quandoFormatado, consultaId }) {
  await paraUsuario(usuarioResponsavelId, {
    titulo: 'Consulta cancelada',
    mensagem: `Agendamento de ${quandoFormatado} foi cancelado`,
    tipo: 'consulta',
    referencia_id: consultaId,
  });
  // A recepção precisa saber pra liberar o horário na agenda.
  return paraPerfis(['recepcionista'], {
    titulo: 'Consulta cancelada',
    mensagem: `Horário de ${quandoFormatado} ficou livre na agenda`,
    tipo: 'consulta',
    referencia_id: consultaId,
  });
}

// ── Cirurgias ──────────────────────────────────────────────────────────

async function cirurgiaAgendada({ cirurgiaId, pacienteNome, quandoFormatado, alunosIds = [] }) {
  await paraPerfis(['professor'], {
    titulo: 'Nova cirurgia agendada',
    mensagem: `${pacienteNome} — ${quandoFormatado}`,
    tipo: 'cirurgia',
    referencia_id: cirurgiaId,
  });
  return Promise.all(alunosIds.map((id) => paraUsuario(id, {
    titulo: 'Você foi vinculado a uma cirurgia',
    mensagem: `${pacienteNome} — ${quandoFormatado}`,
    tipo: 'cirurgia',
    referencia_id: cirurgiaId,
  })));
}

async function alunoVinculadoACirurgia(alunoId, { cirurgiaId, pacienteNome, quandoFormatado }) {
  return paraUsuario(alunoId, {
    titulo: 'Você foi vinculado a uma cirurgia',
    mensagem: `${pacienteNome} — ${quandoFormatado}`,
    tipo: 'cirurgia',
    referencia_id: cirurgiaId,
  });
}

module.exports = {
  PERFIS_CLINICOS,
  paraUsuario,
  paraPerfis,
  estoqueBaixo,
  materialVencendo,
  controleBiologicoPositivo,
  consultaAgendada,
  consultaReagendada,
  consultaCancelada,
  cirurgiaAgendada,
  alunoVinculadoACirurgia,
};
