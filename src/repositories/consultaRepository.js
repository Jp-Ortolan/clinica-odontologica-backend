// Queries SQL da tabela consulta.

const pool = require('../config/database');

async function listar(filtros = {}) {
  const condicoes = [];
  const valores = [];

  if (filtros.status) {
    valores.push(filtros.status);
    condicoes.push(`status = $${valores.length}`);
  }

  // Filtro usado pelo seletor "Selecione a disciplina" da agenda.
  if (filtros.disciplina) {
    valores.push(filtros.disciplina);
    condicoes.push(`disciplina = $${valores.length}`);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM consulta ${where} ORDER BY data_hora DESC`,
    valores
  );
  return result.rows;
}

async function buscarPorId(id) {
  const result = await pool.query(
    'SELECT * FROM consulta WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

async function criar(dados) {
  const { paciente_id, usuario_id, data_hora, queixa_principal, observacoes, status, disciplina } = dados;
  const result = await pool.query(
    `INSERT INTO consulta (paciente_id, usuario_id, data_hora, queixa_principal, observacoes, status, disciplina)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'agendada'), $7)
     RETURNING *`,
    [paciente_id, usuario_id, data_hora, queixa_principal, observacoes, status, disciplina ?? null]
  );
  return result.rows[0];
}

async function atualizar(id, dados) {
  const { paciente_id, usuario_id, data_hora, queixa_principal, observacoes, status, disciplina } = dados;
  const result = await pool.query(
    `UPDATE consulta
     SET paciente_id = $1, usuario_id = $2, data_hora = $3, queixa_principal = $4,
         observacoes = $5, status = $6, disciplina = $7
     WHERE id = $8
     RETURNING *`,
    [paciente_id, usuario_id, data_hora, queixa_principal, observacoes, status, disciplina ?? null, id]
  );
  return result.rows[0] || null;
}

async function deletar(id) {
  const result = await pool.query(
    'DELETE FROM consulta WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0] || null;
}

// ── Materiais previstos da consulta (tabela consulta_material) ──────────
// Mesmo desenho já usado em cirurgia_material (migration 006).

async function listarMateriaisDaConsulta(consultaId) {
  const result = await pool.query(
    `SELECT cm.*, m.nome AS material_nome, m.codigo_barras, m.unidade_medida
     FROM consulta_material cm
     JOIN material m ON m.id = cm.material_id
     WHERE cm.consulta_id = $1
     ORDER BY cm.id ASC`,
    [consultaId]
  );
  return result.rows;
}

async function buscarMaterialDaConsultaPorId(id) {
  const result = await pool.query(
    `SELECT cm.*, m.nome AS material_nome, m.codigo_barras, m.unidade_medida
     FROM consulta_material cm
     JOIN material m ON m.id = cm.material_id
     WHERE cm.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function buscarVinculoPorConsultaEMaterial(consultaId, materialId) {
  const result = await pool.query(
    'SELECT * FROM consulta_material WHERE consulta_id = $1 AND material_id = $2',
    [consultaId, materialId]
  );
  return result.rows[0] || null;
}

async function adicionarMaterial(consultaId, dados) {
  const { material_id, quantidade } = dados;
  const result = await pool.query(
    `INSERT INTO consulta_material (consulta_id, material_id, quantidade)
     VALUES ($1, $2, COALESCE($3, 1)) RETURNING id`,
    [consultaId, material_id, quantidade]
  );
  return buscarMaterialDaConsultaPorId(result.rows[0].id);
}

async function atualizarQuantidadeMaterial(id, quantidade) {
  const result = await pool.query(
    'UPDATE consulta_material SET quantidade = $1 WHERE id = $2 RETURNING id',
    [quantidade, id]
  );
  if (!result.rows[0]) return null;
  return buscarMaterialDaConsultaPorId(id);
}

async function removerMaterial(id) {
  const result = await pool.query(
    'DELETE FROM consulta_material WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  listar, buscarPorId, criar, atualizar, deletar,
  listarMateriaisDaConsulta, buscarMaterialDaConsultaPorId,
  buscarVinculoPorConsultaEMaterial,
  adicionarMaterial, atualizarQuantidadeMaterial, removerMaterial,
};
