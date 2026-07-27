// Queries SQL de esterilização e pacote esterilizado — só acesso ao
// banco, sem regra de negócio aqui.

const pool = require('../config/database');

// ── Ciclos de esterilização ──────────────────────────────────

async function listar({ status, equipamento } = {}) {
  const condicoes = [];
  const valores = [];

  if (status) {
    condicoes.push(`e.status = $${valores.length + 1}`);
    valores.push(status);
  }
  if (equipamento) {
    condicoes.push(`e.equipamento ILIKE $${valores.length + 1}`);
    valores.push(`%${equipamento}%`);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT e.*, u.nome AS operador_nome
     FROM esterilizacao e
     LEFT JOIN usuario u ON u.id = e.usuario_id
     ${where}
     ORDER BY e.data_hora DESC`,
    valores
  );
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    `SELECT e.*, u.nome AS operador_nome
     FROM esterilizacao e
     LEFT JOIN usuario u ON u.id = e.usuario_id
     WHERE e.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function criar(dados) {
  const {
    usuario_id, equipamento, tipo_ciclo = 'vapor',
    temperatura, pressao, duracao_minutos,
    resultado = 'pendente', controle_biologico = false,
    status = 'pendente', observacoes,
  } = dados;

  const { rows } = await pool.query(
    `INSERT INTO esterilizacao
       (usuario_id, equipamento, tipo_ciclo, temperatura, pressao,
        duracao_minutos, resultado, controle_biologico, status, observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [usuario_id, equipamento, tipo_ciclo, temperatura, pressao,
     duracao_minutos, resultado, controle_biologico, status, observacoes]
  );
  return rows[0];
}

async function atualizar(id, dados) {
  const {
    equipamento, tipo_ciclo, temperatura, pressao, duracao_minutos,
    resultado, controle_biologico, status, observacoes,
  } = dados;

  const { rows } = await pool.query(
    `UPDATE esterilizacao SET
       equipamento        = COALESCE($1,  equipamento),
       tipo_ciclo         = COALESCE($2,  tipo_ciclo),
       temperatura        = COALESCE($3,  temperatura),
       pressao            = COALESCE($4,  pressao),
       duracao_minutos    = COALESCE($5,  duracao_minutos),
       resultado          = COALESCE($6,  resultado),
       controle_biologico = COALESCE($7,  controle_biologico),
       status             = COALESCE($8,  status),
       observacoes        = COALESCE($9,  observacoes)
     WHERE id = $10
     RETURNING *`,
    [equipamento, tipo_ciclo, temperatura, pressao, duracao_minutos,
     resultado, controle_biologico, status, observacoes, id]
  );
  return rows[0] || null;
}

async function deletar(id) {
  const { rows } = await pool.query(
    'DELETE FROM esterilizacao WHERE id = $1 RETURNING id',
    [id]
  );
  return rows[0] || null;
}

// ── Pacotes esterilizados ────────────────────────────────────

async function listarPacotes(esterilizacaoId) {
  const { rows } = await pool.query(
    `SELECT p.*, m.nome AS material_nome
     FROM pacote_esterilizado p
     JOIN material m ON m.id = p.material_id
     WHERE p.esterilizacao_id = $1
     ORDER BY p.criado_em`,
    [esterilizacaoId]
  );
  return rows;
}

async function buscarPacotePorId(id) {
  const { rows } = await pool.query(
    `SELECT p.*, m.nome AS material_nome
     FROM pacote_esterilizado p
     JOIN material m ON m.id = p.material_id
     WHERE p.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function criarPacote(dados) {
  const { esterilizacao_id, material_id, qr_code, status = 'esterilizado', validade } = dados;
  const { rows } = await pool.query(
    `INSERT INTO pacote_esterilizado (esterilizacao_id, material_id, qr_code, status, validade)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [esterilizacao_id, material_id, qr_code, status, validade]
  );
  return rows[0];
}

async function atualizarStatusPacote(id, status) {
  const { rows } = await pool.query(
    'UPDATE pacote_esterilizado SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return rows[0] || null;
}

module.exports = {
  listar, buscarPorId, criar, atualizar, deletar,
  listarPacotes, buscarPacotePorId, criarPacote, atualizarStatusPacote,
};
