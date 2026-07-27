// Queries SQL da tabela paciente e das tabelas relacionadas: alergias,
// medicamentos, documentos e evolução.

const pool = require('../config/database');

// ── Paciente ─────────────────────────────────────────────────

async function listar(filtros = {}) {
  const condicoes = [];
  const valores = [];

  if (typeof filtros.ativo === 'boolean') {
    valores.push(filtros.ativo);
    condicoes.push(`ativo = $${valores.length}`);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM paciente ${where} ORDER BY nome ASC`,
    valores
  );
  return result.rows;
}

async function buscarPorId(id) {
  const result = await pool.query(
    'SELECT * FROM paciente WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function buscarPorCpf(cpf) {
  const result = await pool.query(
    'SELECT * FROM paciente WHERE cpf = $1',
    [cpf]
  );
  return result.rows[0] || null;
}

async function criar(dados) {
  const { nome, cpf, data_nascimento, telefone, email, endereco } = dados;
  const result = await pool.query(
    `INSERT INTO paciente (nome, cpf, data_nascimento, telefone, email, endereco)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [nome, cpf, data_nascimento, telefone, email, endereco]
  );
  return result.rows[0];
}

async function atualizar(id, dados) {
  const { nome, cpf, data_nascimento, telefone, email, endereco } = dados;
  const result = await pool.query(
    `UPDATE paciente
     SET nome = $1, cpf = $2, data_nascimento = $3, telefone = $4, email = $5, endereco = $6
     WHERE id = $7
     RETURNING *`,
    [nome, cpf, data_nascimento, telefone, email, endereco, id]
  );
  return result.rows[0] || null;
}

async function atualizarStatusAtivo(id, ativo) {
  const result = await pool.query(
    'UPDATE paciente SET ativo = $1 WHERE id = $2 RETURNING *',
    [ativo, id]
  );
  return result.rows[0] || null;
}

async function deletar(id) {
  const result = await pool.query(
    'DELETE FROM paciente WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0] || null;
}

// ── Alergias ─────────────────────────────────────────────────

async function listarAlergias(pacienteId) {
  const result = await pool.query(
    'SELECT * FROM alergia_paciente WHERE paciente_id = $1 ORDER BY id ASC',
    [pacienteId]
  );
  return result.rows;
}

async function criarAlergia(pacienteId, dados) {
  const { substancia, gravidade } = dados;
  const result = await pool.query(
    `INSERT INTO alergia_paciente (paciente_id, substancia, gravidade)
     VALUES ($1, $2, $3) RETURNING *`,
    [pacienteId, substancia, gravidade]
  );
  return result.rows[0];
}

async function deletarAlergia(id) {
  const result = await pool.query(
    'DELETE FROM alergia_paciente WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0] || null;
}

// ── Medicamentos ─────────────────────────────────────────────

async function listarMedicamentos(pacienteId) {
  const result = await pool.query(
    'SELECT * FROM medicamento_paciente WHERE paciente_id = $1 ORDER BY id ASC',
    [pacienteId]
  );
  return result.rows;
}

async function criarMedicamento(pacienteId, dados) {
  const { nome_medicamento, dosagem } = dados;
  const result = await pool.query(
    `INSERT INTO medicamento_paciente (paciente_id, nome_medicamento, dosagem)
     VALUES ($1, $2, $3) RETURNING *`,
    [pacienteId, nome_medicamento, dosagem]
  );
  return result.rows[0];
}

async function deletarMedicamento(id) {
  const result = await pool.query(
    'DELETE FROM medicamento_paciente WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0] || null;
}

// ── Documentos ───────────────────────────────────────────────
// Listagem nunca traz a coluna "conteudo" (arquivo binário) — só o download.

async function listarDocumentos(pacienteId) {
  const result = await pool.query(
    `SELECT id, paciente_id, usuario_id, nome_arquivo, tipo_arquivo, tamanho_bytes, criado_em
     FROM documento_paciente WHERE paciente_id = $1 ORDER BY criado_em DESC`,
    [pacienteId]
  );
  return result.rows;
}

async function buscarDocumentoPorId(id) {
  const result = await pool.query(
    'SELECT * FROM documento_paciente WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function criarDocumento(pacienteId, usuarioId, dados) {
  const { nome_arquivo, tipo_arquivo, tamanho_bytes, conteudo } = dados;
  const result = await pool.query(
    `INSERT INTO documento_paciente (paciente_id, usuario_id, nome_arquivo, tipo_arquivo, tamanho_bytes, conteudo)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, paciente_id, usuario_id, nome_arquivo, tipo_arquivo, tamanho_bytes, criado_em`,
    [pacienteId, usuarioId, nome_arquivo, tipo_arquivo, tamanho_bytes, conteudo]
  );
  return result.rows[0];
}

async function deletarDocumento(id) {
  const result = await pool.query(
    'DELETE FROM documento_paciente WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0] || null;
}

// ── Evolução do paciente ─────────────────────────────────────

async function listarEvolucoes(pacienteId) {
  const result = await pool.query(
    'SELECT * FROM evolucao_paciente WHERE paciente_id = $1 ORDER BY criado_em DESC',
    [pacienteId]
  );
  return result.rows;
}

async function criarEvolucao(pacienteId, usuarioId, dados) {
  const { descricao, consulta_id } = dados;
  const result = await pool.query(
    `INSERT INTO evolucao_paciente (paciente_id, usuario_id, consulta_id, descricao)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [pacienteId, usuarioId, consulta_id || null, descricao]
  );
  return result.rows[0];
}

module.exports = {
  listar, buscarPorId, buscarPorCpf, criar, atualizar, atualizarStatusAtivo, deletar,
  listarAlergias, criarAlergia, deletarAlergia,
  listarMedicamentos, criarMedicamento, deletarMedicamento,
  listarDocumentos, buscarDocumentoPorId, criarDocumento, deletarDocumento,
  listarEvolucoes, criarEvolucao,
};
