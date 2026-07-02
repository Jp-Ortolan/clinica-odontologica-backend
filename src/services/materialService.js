// Service: material
// Regras de negócio do módulo de estoque

const materialRepository = require('../repositories/materialRepository');
const categoriaRepository = require('../repositories/categoriaRepository');
const {
  validarCamposObrigatoriosMaterial,
  validarValoresNumericosMaterial,
} = require('../utils/validacoesEstoque');

// Calcula campos derivados que a tela "Detalhes do material" exibe,
// mas que não ficam armazenados no banco (status e quantidade em falta).
function comCamposCalculados(material) {
  if (!material) return material;

  const quantidade = material.quantidade;
  const estoqueMinimo = material.estoque_minimo;
  const estoqueIdeal = material.estoque_ideal;

  let status_estoque = 'Normal';
  if (quantidade <= estoqueMinimo) {
    status_estoque = 'Crítico';
  } else if (estoqueIdeal != null && quantidade <= estoqueIdeal) {
    status_estoque = 'Baixo';
  }

  const em_falta = estoqueIdeal != null ? Math.max(estoqueIdeal - quantidade, 0) : null;

  return { ...material, status_estoque, em_falta };
}

async function listar(filtros) {
  const materiais = await materialRepository.listar(filtros);
  return materiais.map(comCamposCalculados);
}

async function buscarPorId(id) {
  const material = await materialRepository.buscarPorId(id);
  if (!material) throw { status: 404, message: 'Material não encontrado' };
  return comCamposCalculados(material);
}

async function validarCategoria(categoriaId) {
  const categoria = await categoriaRepository.buscarPorId(categoriaId);
  if (!categoria) throw { status: 400, message: 'Categoria informada não existe' };
}

async function criar(dados) {
  const erros = [
    ...validarCamposObrigatoriosMaterial(dados),
    ...validarValoresNumericosMaterial(dados),
  ];
  if (erros.length) throw { status: 400, message: erros.join('; ') };

  await validarCategoria(dados.categoria_id);

  // Regra: código de barras não pode ser duplicado
  const materialExistente = await materialRepository.buscarPorCodigoBarras(dados.codigo_barras);
  if (materialExistente) {
    throw { status: 409, message: 'Já existe um material cadastrado com esse código de barras' };
  }

  const quantidade = dados.quantidade ?? 0;
  const estoqueMinimo = dados.estoque_minimo ?? 5;
  const estoqueIdeal = dados.estoque_ideal ?? null;

  // Regra: estoque ideal não pode ser menor que o estoque mínimo
  if (estoqueIdeal != null && Number(estoqueIdeal) < Number(estoqueMinimo)) {
    throw { status: 400, message: 'Estoque ideal não pode ser menor que o estoque mínimo' };
  }

  const material = await materialRepository.criar({
    nome: dados.nome.trim(),
    codigo_barras: dados.codigo_barras.trim(),
    categoria_id: dados.categoria_id,
    unidade_medida: dados.unidade_medida.trim(),
    quantidade,
    estoque_minimo: estoqueMinimo,
    estoque_ideal: estoqueIdeal,
    fabricante: dados.fabricante ?? null,
    lote: dados.lote ?? null,
    registro_anvisa: dados.registro_anvisa ?? null,
    data_entrada: dados.data_entrada ?? null,
    validade: dados.validade ?? null,
  });

  return comCamposCalculados(material);
}

async function atualizar(id, dados) {
  const materialAtual = await materialRepository.buscarPorId(id);
  if (!materialAtual) throw { status: 404, message: 'Material não encontrado' };

  const dadosAtualizados = {
    nome: dados.nome ?? materialAtual.nome,
    codigo_barras: dados.codigo_barras ?? materialAtual.codigo_barras,
    categoria_id: dados.categoria_id ?? materialAtual.categoria_id,
    unidade_medida: dados.unidade_medida ?? materialAtual.unidade_medida,
    quantidade: dados.quantidade ?? materialAtual.quantidade,
    estoque_minimo: dados.estoque_minimo ?? materialAtual.estoque_minimo,
    estoque_ideal: dados.estoque_ideal !== undefined ? dados.estoque_ideal : materialAtual.estoque_ideal,
    fabricante: dados.fabricante ?? materialAtual.fabricante,
    lote: dados.lote ?? materialAtual.lote,
    registro_anvisa: dados.registro_anvisa ?? materialAtual.registro_anvisa,
    data_entrada: dados.data_entrada ?? materialAtual.data_entrada,
    validade: dados.validade ?? materialAtual.validade,
  };

  const erros = [
    ...validarCamposObrigatoriosMaterial(dadosAtualizados),
    ...validarValoresNumericosMaterial(dadosAtualizados),
  ];
  if (erros.length) throw { status: 400, message: erros.join('; ') };

  if (dadosAtualizados.categoria_id !== materialAtual.categoria_id) {
    await validarCategoria(dadosAtualizados.categoria_id);
  }

  if (dadosAtualizados.codigo_barras !== materialAtual.codigo_barras) {
    const emUso = await materialRepository.buscarPorCodigoBarras(dadosAtualizados.codigo_barras);
    if (emUso) throw { status: 409, message: 'Código de barras já cadastrado para outro material' };
  }

  if (
    dadosAtualizados.estoque_ideal != null &&
    Number(dadosAtualizados.estoque_ideal) < Number(dadosAtualizados.estoque_minimo)
  ) {
    throw { status: 400, message: 'Estoque ideal não pode ser menor que o estoque mínimo' };
  }

  const material = await materialRepository.atualizar(id, dadosAtualizados);
  return comCamposCalculados(material);
}

async function deletar(id) {
  const material = await materialRepository.buscarPorId(id);
  if (!material) throw { status: 404, message: 'Material não encontrado' };

  // Regra: material com movimentações registradas não pode ser excluído
  const totalMovimentacoes = await materialRepository.contarMovimentacoesVinculadas(id);
  if (totalMovimentacoes > 0) {
    throw {
      status: 409,
      message: `Material possui ${totalMovimentacoes} movimentação(ões) de estoque vinculada(s) e não pode ser excluído`,
    };
  }

  await materialRepository.deletar(id);
  return { message: 'Material removido com sucesso' };
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar, comCamposCalculados };
