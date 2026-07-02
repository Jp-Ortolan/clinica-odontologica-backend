// Repository: movimentacao
// Responsável por todas as queries SQL da tabela movimentacao_estoque

const pool = require('../config/database');

const SELECT_BASE = `
  SELECT mv.*, m.nome AS material_nome, u.nome AS usuario_nome
  FROM movimentacao_estoque mv
  JOIN material m ON m.id = mv.material_id
  JOIN usuario u ON u.id = mv.usuario_id
`;

async function listar(filtros = {}) {
  const condicoes = [];
  const valores = [];

  if (filtros.material_id) {
    valores.push(filtros.material_id);
    condicoes.push(`mv.material_id = $${valores.length}`);
  }

  if (filtros.tipo) {
    valores.push(filtros.tipo);
    condicoes.push(`mv.tipo = $${valores.length}`);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const result = await pool.query(
    `${SELECT_BASE} ${where} ORDER BY mv.data_hora DESC`,
    valores
  );
  return result.rows;
}

async function buscarPorId(id) {
  const result = await pool.query(`${SELECT_BASE} WHERE mv.id = $1`, [id]);
  return result.rows[0] || null;
}

async function criar(dados) {
  const { material_id, usuario_id, tipo, quantidade, observacao } = dados;
  const result = await pool.query(
    `INSERT INTO movimentacao_estoque (material_id, usuario_id, tipo, quantidade, observacao)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [material_id, usuario_id, tipo, quantidade, observacao ?? null]
  );
  return buscarPorId(result.rows[0].id);
}

async function deletar(id) {
  const result = await pool.query(
    'DELETE FROM movimentacao_estoque WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { listar, buscarPorId, criar, deletar };
