// Validações de campos do módulo de estoque (material e movimentação),
// centralizadas aqui para os services reaproveitarem.

function ehInteiroValido(valor) {
  if (valor === undefined || valor === null) return false;
  return Number.isInteger(Number(valor)) && Number(valor) >= 0;
}

function ehDataValida(valor) {
  if (valor === undefined || valor === null || valor === '') return true; // campo opcional
  return !isNaN(Date.parse(valor));
}

function validarCamposObrigatoriosMaterial(dados) {
  const erros = [];
  if (!dados.nome || !String(dados.nome).trim()) {
    erros.push('Nome é obrigatório');
  }
  if (!dados.codigo_barras || !String(dados.codigo_barras).trim()) {
    erros.push('Código de barras é obrigatório');
  }
  if (dados.categoria_id === undefined || dados.categoria_id === null || dados.categoria_id === '') {
    erros.push('Categoria é obrigatória');
  }
  if (!dados.unidade_medida || !String(dados.unidade_medida).trim()) {
    erros.push('Unidade de medida é obrigatória');
  }
  return erros;
}

function validarValoresNumericosMaterial(dados) {
  const erros = [];

  if (dados.quantidade !== undefined && dados.quantidade !== null && !ehInteiroValido(dados.quantidade)) {
    erros.push('Quantidade deve ser um número inteiro maior ou igual a zero');
  }
  if (dados.estoque_minimo !== undefined && dados.estoque_minimo !== null && !ehInteiroValido(dados.estoque_minimo)) {
    erros.push('Estoque mínimo deve ser um número inteiro maior ou igual a zero');
  }
  if (dados.estoque_ideal !== undefined && dados.estoque_ideal !== null && !ehInteiroValido(dados.estoque_ideal)) {
    erros.push('Estoque ideal deve ser um número inteiro maior ou igual a zero');
  }
  if (!ehDataValida(dados.data_entrada)) {
    erros.push('Data de entrada inválida');
  }
  if (!ehDataValida(dados.validade)) {
    erros.push('Data de validade inválida');
  }

  return erros;
}

function validarMovimentacao(dados) {
  const erros = [];

  if (!dados.material_id) {
    erros.push('Material é obrigatório');
  }
  if (!dados.tipo || !['entrada', 'saida'].includes(dados.tipo)) {
    erros.push("Tipo deve ser 'entrada' ou 'saida'");
  }
  if (!ehInteiroValido(dados.quantidade) || Number(dados.quantidade) <= 0) {
    erros.push('Quantidade deve ser um número inteiro maior que zero');
  }

  return erros;
}

module.exports = {
  ehInteiroValido,
  ehDataValida,
  validarCamposObrigatoriosMaterial,
  validarValoresNumericosMaterial,
  validarMovimentacao,
};
