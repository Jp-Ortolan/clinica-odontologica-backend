// Queries SQL da tabela notificacao.

const pool = require('../config/database');

// Lista as notificações de um usuário, mais recentes primeiro.
// `apenasNaoLidas` e `limite` são opcionais.
async function listarPorUsuario(usuarioId, { apenasNaoLidas = false, limite = 50 } = {}) {
  const condicoes = ['usuario_id = $1'];
  const valores = [usuarioId];

  if (apenasNaoLidas) {
    condicoes.push('lida = FALSE');
  }

  valores.push(limite);

  const result = await pool.query(
    `SELECT * FROM notificacao
      WHERE ${condicoes.join(' AND ')}
      ORDER BY criado_em DESC
      LIMIT $${valores.length}`,
    valores
  );
  return result.rows;
}

async function contarNaoLidas(usuarioId) {
  const result = await pool.query(
    'SELECT COUNT(*)::int AS total FROM notificacao WHERE usuario_id = $1 AND lida = FALSE',
    [usuarioId]
  );
  return result.rows[0].total;
}

async function buscarPorId(id) {
  const result = await pool.query('SELECT * FROM notificacao WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function criar(dados) {
  const { usuario_id, titulo, mensagem, tipo, link, referencia_id } = dados;
  const result = await pool.query(
    `INSERT INTO notificacao (usuario_id, titulo, mensagem, tipo, link, referencia_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [usuario_id, titulo, mensagem || null, tipo || 'sistema', link || null, referencia_id || null]
  );
  return result.rows[0];
}

// Marca uma notificação como lida. O usuario_id entra na cláusula WHERE de
// propósito: garante que ninguém marque como lida a notificação de outro.
async function marcarComoLida(id, usuarioId) {
  const result = await pool.query(
    `UPDATE notificacao
        SET lida = TRUE, lida_em = NOW()
      WHERE id = $1 AND usuario_id = $2
      RETURNING *`,
    [id, usuarioId]
  );
  return result.rows[0] || null;
}

async function marcarTodasComoLidas(usuarioId) {
  const result = await pool.query(
    `UPDATE notificacao
        SET lida = TRUE, lida_em = NOW()
      WHERE usuario_id = $1 AND lida = FALSE
      RETURNING id`,
    [usuarioId]
  );
  return result.rowCount;
}

async function deletar(id, usuarioId) {
  const result = await pool.query(
    'DELETE FROM notificacao WHERE id = $1 AND usuario_id = $2 RETURNING id',
    [id, usuarioId]
  );
  return result.rows[0] || null;
}

// Usado quando um evento interessa a um perfil inteiro (ex.: avisar todos
// os professores). Retorna os ids dos usuários ativos daquele perfil.
async function listarIdsUsuariosPorPerfil(perfil) {
  const result = await pool.query(
    'SELECT id FROM usuario WHERE perfil = $1 AND ativo = TRUE',
    [perfil]
  );
  return result.rows.map((r) => r.id);
}

module.exports = {
  listarPorUsuario,
  contarNaoLidas,
  buscarPorId,
  criar,
  marcarComoLida,
  marcarTodasComoLidas,
  deletar,
  listarIdsUsuariosPorPerfil,
};
