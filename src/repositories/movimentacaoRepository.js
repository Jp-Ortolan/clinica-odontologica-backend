// Queries SQL da tabela movimentacao_estoque.

const pool = require('../config/database');

const SELECT_BASE = `
  SELECT mv.*, m.nome AS material_nome, u.nome AS usuario_nome, l.lote AS lote_nome, l.validade AS lote_validade
  FROM movimentacao_estoque mv
  JOIN material m ON m.id = mv.material_id
  JOIN usuario u ON u.id = mv.usuario_id
  LEFT JOIN material_lote l ON l.id = mv.lote_id
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



module.exports = { listar, buscarPorId };
