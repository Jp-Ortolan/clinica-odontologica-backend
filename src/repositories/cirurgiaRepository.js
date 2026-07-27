// Repository: cirurgia
// Responsável por todas as queries SQL da tabela cirurgia, além de
// mutirão cirúrgico (evento que agrupa cirurgias) e compartilhamento
// de cursos (alunos vinculados a uma cirurgia para crédito/supervisão).

const pool = require('../config/database');

// ── Cirurgia ─────────────────────────────────────────────────

async function listar(filtros = {}) {
  const condicoes = [];
  const valores = [];

  if (filtros.status) {
    valores.push(filtros.status);
    condicoes.push(`status = $${valores.length}`);
  }
  if (filtros.mutirao_id) {
    valores.push(filtros.mutirao_id);
    condicoes.push(`mutirao_id = $${valores.length}`);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM cirurgia ${where} ORDER BY data_hora DESC`,
    valores
  );
  return result.rows;
}

async function buscarPorId(id) {
  const result = await pool.query(
    'SELECT * FROM cirurgia WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function criar(dados) {
  const { paciente_id, usuario_id, data_hora, tipo_cirurgia, observacoes, status, mutirao_id } = dados;
  const result = await pool.query(
    `INSERT INTO cirurgia (paciente_id, usuario_id, data_hora, tipo_cirurgia, observacoes, status, mutirao_id)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'agendada'), $7)
     RETURNING *`,
    [paciente_id, usuario_id, data_hora, tipo_cirurgia, observacoes, status, mutirao_id || null]
  );
  return result.rows[0];
}

async function atualizar(id, dados) {
  const { paciente_id, usuario_id, data_hora, tipo_cirurgia, observacoes, status, mutirao_id } = dados;
  const result = await pool.query(
    `UPDATE cirurgia
     SET paciente_id = $1, usuario_id = $2, data_hora = $3, tipo_cirurgia = $4, observacoes = $5, status = $6, mutirao_id = $7
     WHERE id = $8
     RETURNING *`,
    [paciente_id, usuario_id, data_hora, tipo_cirurgia, observacoes, status, mutirao_id || null, id]
  );
  return result.rows[0] || null;
}

async function deletar(id) {
  const result = await pool.query(
    'DELETE FROM cirurgia WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0] || null;
}

// ── Mutirão cirúrgico ────────────────────────────────────────

async function listarMutiroes() {
  const result = await pool.query('SELECT * FROM mutirao_cirurgico ORDER BY data_evento DESC');
  return result.rows;
}

async function buscarMutiraoPorId(id) {
  const result = await pool.query('SELECT * FROM mutirao_cirurgico WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function criarMutirao(dados, usuarioId) {
  const { nome, data_evento, local, observacoes } = dados;
  const result = await pool.query(
    `INSERT INTO mutirao_cirurgico (nome, data_evento, local, usuario_id, observacoes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [nome, data_evento, local, usuarioId, observacoes]
  );
  return result.rows[0];
}

async function atualizarMutirao(id, dados) {
  const { nome, data_evento, local, observacoes } = dados;
  const result = await pool.query(
    `UPDATE mutirao_cirurgico SET nome = $1, data_evento = $2, local = $3, observacoes = $4
     WHERE id = $5 RETURNING *`,
    [nome, data_evento, local, observacoes, id]
  );
  return result.rows[0] || null;
}

async function deletarMutirao(id) {
  const result = await pool.query('DELETE FROM mutirao_cirurgico WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
}

// ── Compartilhamento de cursos (alunos vinculados à cirurgia) ──

async function listarAlunosDaCirurgia(cirurgiaId) {
  const result = await pool.query(
    'SELECT * FROM cirurgia_aluno WHERE cirurgia_id = $1 ORDER BY id ASC',
    [cirurgiaId]
  );
  return result.rows;
}

async function vincularAluno(cirurgiaId, dados) {
  const { usuario_id, curso, papel } = dados;
  const result = await pool.query(
    `INSERT INTO cirurgia_aluno (cirurgia_id, usuario_id, curso, papel)
     VALUES ($1, $2, $3, COALESCE($4, 'observador')) RETURNING *`,
    [cirurgiaId, usuario_id, curso, papel]
  );
  return result.rows[0];
}

async function desvincularAluno(id) {
  const result = await pool.query('DELETE FROM cirurgia_aluno WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
}

module.exports = {
  listar, buscarPorId, criar, atualizar, deletar,
  listarMutiroes, buscarMutiraoPorId, criarMutirao, atualizarMutirao, deletarMutirao,
  listarAlunosDaCirurgia, vincularAluno, desvincularAluno,
};
