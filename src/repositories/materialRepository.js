// Queries SQL da tabela material.

const pool = require('../config/database');

const SELECT_BASE = `
  SELECT m.*, c.nome AS categoria_nome
  FROM material m
  LEFT JOIN categoria c ON c.id = m.categoria_id
`;

// Listagem não traz o base64 da imagem inteiro (pode chegar a alguns MB
// por item) — só um booleano indicando se o material tem foto. A tela
// de detalhes, que usa buscarPorId, é quem carrega a imagem completa.
const SELECT_LIST = `
  SELECT
    m.id, m.nome, m.codigo_barras, m.categoria_id, m.unidade_medida,
    m.quantidade, m.estoque_minimo, m.estoque_ideal, m.fabricante, m.lote,
    m.registro_anvisa, m.data_entrada, m.validade, m.criado_em,
    (m.imagem_base64 IS NOT NULL) AS tem_imagem,
    c.nome AS categoria_nome
  FROM material m
  LEFT JOIN categoria c ON c.id = m.categoria_id
`;

async function listar(filtros = {}) {
  const condicoes = [];
  const valores = [];

  if (filtros.categoria_id) {
    valores.push(filtros.categoria_id);
    condicoes.push(`m.categoria_id = $${valores.length}`);
  }

  if (filtros.busca) {
    valores.push(`%${filtros.busca}%`);
    condicoes.push(`(m.nome ILIKE $${valores.length} OR m.codigo_barras ILIKE $${valores.length})`);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const result = await pool.query(
    `${SELECT_LIST} ${where} ORDER BY m.nome ASC`,
    valores
  );
  return result.rows;
}

async function buscarPorId(id) {
  const result = await pool.query(`${SELECT_BASE} WHERE m.id = $1`, [id]);
  return result.rows[0] || null;
}

async function buscarPorCodigoBarras(codigoBarras) {
  const result = await pool.query(
    'SELECT * FROM material WHERE codigo_barras = $1',
    [codigoBarras]
  );
  return result.rows[0] || null;
}

async function criar(dados) {
  const {
    nome,
    codigo_barras,
    categoria_id,
    unidade_medida,
    quantidade,
    estoque_minimo,
    estoque_ideal,
    fabricante,
    lote,
    registro_anvisa,
    data_entrada,
    validade,
    imagem_base64,
  } = dados;

  const result = await pool.query(
    `INSERT INTO material
       (nome, codigo_barras, categoria_id, unidade_medida, quantidade,
        estoque_minimo, estoque_ideal, fabricante, lote, registro_anvisa,
        data_entrada, validade, imagem_base64)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      nome,
      codigo_barras,
      categoria_id,
      unidade_medida,
      quantidade,
      estoque_minimo,
      estoque_ideal,
      fabricante,
      lote,
      registro_anvisa,
      data_entrada,
      validade,
      imagem_base64 ?? null,
    ]
  );
  return buscarPorId(result.rows[0].id);
}

async function atualizar(id, dados) {
  const {
    nome,
    codigo_barras,
    categoria_id,
    unidade_medida,
    quantidade,
    estoque_minimo,
    estoque_ideal,
    fabricante,
    lote,
    registro_anvisa,
    data_entrada,
    validade,
    imagem_base64,
  } = dados;

  const result = await pool.query(
    `UPDATE material
     SET nome = $1, codigo_barras = $2, categoria_id = $3, unidade_medida = $4,
         quantidade = $5, estoque_minimo = $6, estoque_ideal = $7, fabricante = $8,
         lote = $9, registro_anvisa = $10, data_entrada = $11, validade = $12,
         imagem_base64 = $13
     WHERE id = $14
     RETURNING id`,
    [
      nome,
      codigo_barras,
      categoria_id,
      unidade_medida,
      quantidade,
      estoque_minimo,
      estoque_ideal,
      fabricante,
      lote,
      registro_anvisa,
      data_entrada,
      validade,
      imagem_base64 ?? null,
      id,
    ]
  );
  if (!result.rows[0]) return null;
  return buscarPorId(id);
}

async function deletar(id) {
  const result = await pool.query(
    'DELETE FROM material WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0] || null;
}

async function contarMovimentacoesVinculadas(id) {
  const result = await pool.query(
    'SELECT COUNT(*)::int AS total FROM movimentacao_estoque WHERE material_id = $1',
    [id]
  );
  return result.rows[0].total;
}

// Ajusta a quantidade em estoque de forma atômica.
// delta positivo = entrada, delta negativo = saída.
// A CHECK chk_material_quantidade_nao_negativa garante que o estoque
// nunca fique negativo (lança erro de constraint se isso for tentado).
async function ajustarQuantidade(id, delta) {
  const result = await pool.query(
    `UPDATE material
     SET quantidade = quantidade + $1
     WHERE id = $2
     RETURNING *`,
    [delta, id]
  );
  return result.rows[0] || null;
}

module.exports = {
  listar,
  buscarPorId,
  buscarPorCodigoBarras,
  criar,
  atualizar,
  deletar,
  contarMovimentacoesVinculadas,
  ajustarQuantidade,
};
