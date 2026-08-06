// Regras de negócio das notificações.

const notificacaoRepository = require('../repositories/notificacaoRepository');

const TIPOS_VALIDOS = ['consulta', 'cirurgia', 'estoque', 'cme', 'paciente', 'sistema'];

async function listar(usuarioId, { apenasNaoLidas, limite } = {}) {
  const limiteNumerico = Number(limite);
  return notificacaoRepository.listarPorUsuario(usuarioId, {
    apenasNaoLidas: apenasNaoLidas === true || apenasNaoLidas === 'true',
    limite: Number.isFinite(limiteNumerico) && limiteNumerico > 0
      ? Math.min(limiteNumerico, 200)
      : 50,
  });
}

async function contarNaoLidas(usuarioId) {
  const total = await notificacaoRepository.contarNaoLidas(usuarioId);
  return { total };
}

async function criar(dados) {
  if (!dados.usuario_id) {
    throw { status: 400, message: 'usuario_id é obrigatório' };
  }
  if (!dados.titulo || !String(dados.titulo).trim()) {
    throw { status: 400, message: 'titulo é obrigatório' };
  }
  if (dados.tipo && !TIPOS_VALIDOS.includes(dados.tipo)) {
    throw { status: 400, message: `tipo inválido. Use um de: ${TIPOS_VALIDOS.join(', ')}` };
  }
  return notificacaoRepository.criar(dados);
}

async function marcarComoLida(id, usuarioId) {
  const atualizada = await notificacaoRepository.marcarComoLida(id, usuarioId);
  if (!atualizada) {
    // Ou não existe, ou pertence a outro usuário — em ambos os casos, do
    // ponto de vista de quem chamou, ela não está disponível.
    throw { status: 404, message: 'Notificação não encontrada' };
  }
  return atualizada;
}

async function marcarTodasComoLidas(usuarioId) {
  const total = await notificacaoRepository.marcarTodasComoLidas(usuarioId);
  return { atualizadas: total };
}

async function deletar(id, usuarioId) {
  const removida = await notificacaoRepository.deletar(id, usuarioId);
  if (!removida) {
    throw { status: 404, message: 'Notificação não encontrada' };
  }
  return removida;
}

// Helper interno: dispara a mesma notificação pra todos os usuários ativos
// de um perfil. Outros services podem chamar isso quando um evento
// relevante acontece (ex.: consulta agendada → avisar os professores).
async function notificarPerfil(perfil, { titulo, mensagem, tipo, link, referencia_id }) {
  const ids = await notificacaoRepository.listarIdsUsuariosPorPerfil(perfil);
  const criadas = await Promise.all(
    ids.map((usuario_id) =>
      notificacaoRepository.criar({ usuario_id, titulo, mensagem, tipo, link, referencia_id })
    )
  );
  return criadas;
}

module.exports = {
  listar,
  contarNaoLidas,
  criar,
  marcarComoLida,
  marcarTodasComoLidas,
  deletar,
  notificarPerfil,
  TIPOS_VALIDOS,
};
