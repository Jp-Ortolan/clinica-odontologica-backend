// Testes: validações de campos do módulo de estoque (src/utils/validacoesEstoque.js)
// Card "Testes validação" do cronograma. São funções puras — testadas diretamente,
// sem necessidade de mockar repositório, banco ou subir a API.

const {
  ehInteiroValido,
  ehDataValida,
  validarCamposObrigatoriosMaterial,
  validarValoresNumericosMaterial,
  validarMovimentacao,
} = require('../src/utils/validacoesEstoque');

describe('ehInteiroValido', () => {
  it('aceita inteiros positivos e zero', () => {
    expect(ehInteiroValido(0)).toBe(true);
    expect(ehInteiroValido(10)).toBe(true);
    expect(ehInteiroValido('15')).toBe(true); // string numérica também é aceita
  });

  it('rejeita negativos, decimais e valores não numéricos', () => {
    expect(ehInteiroValido(-1)).toBe(false);
    expect(ehInteiroValido(1.5)).toBe(false);
    expect(ehInteiroValido('abc')).toBe(false);
    expect(ehInteiroValido(undefined)).toBe(false);
    expect(ehInteiroValido(null)).toBe(false);
  });
});

describe('ehDataValida', () => {
  it('considera campo vazio/ausente como válido (opcional)', () => {
    expect(ehDataValida(undefined)).toBe(true);
    expect(ehDataValida(null)).toBe(true);
    expect(ehDataValida('')).toBe(true);
  });

  it('aceita datas em formato reconhecível', () => {
    expect(ehDataValida('2026-06-19')).toBe(true);
    expect(ehDataValida('2027-12-31')).toBe(true);
  });

  it('rejeita datas inválidas', () => {
    expect(ehDataValida('data-invalida')).toBe(false);
    expect(ehDataValida('32/13/2026')).toBe(false);
  });
});

describe('validarCamposObrigatoriosMaterial', () => {
  const materialValido = {
    nome: 'Lidocaina',
    codigo_barras: '7891234567890',
    categoria_id: 1,
    unidade_medida: 'frasco',
  };

  it('não retorna erros quando todos os campos obrigatórios estão presentes', () => {
    expect(validarCamposObrigatoriosMaterial(materialValido)).toEqual([]);
  });

  it("retorna 'Nome é obrigatório' quando o nome está ausente ou em branco", () => {
    expect(validarCamposObrigatoriosMaterial({ ...materialValido, nome: '' })).toContain(
      'Nome é obrigatório'
    );
    expect(validarCamposObrigatoriosMaterial({ ...materialValido, nome: '   ' })).toContain(
      'Nome é obrigatório'
    );
  });

  it("retorna 'Código de barras é obrigatório' quando ausente", () => {
    const { codigo_barras, ...semCodigo } = materialValido;
    expect(validarCamposObrigatoriosMaterial(semCodigo)).toContain(
      'Código de barras é obrigatório'
    );
  });

  it("retorna 'Categoria é obrigatória' quando categoria_id é undefined, null ou string vazia", () => {
    expect(validarCamposObrigatoriosMaterial({ ...materialValido, categoria_id: undefined })).toContain(
      'Categoria é obrigatória'
    );
    expect(validarCamposObrigatoriosMaterial({ ...materialValido, categoria_id: null })).toContain(
      'Categoria é obrigatória'
    );
    expect(validarCamposObrigatoriosMaterial({ ...materialValido, categoria_id: '' })).toContain(
      'Categoria é obrigatória'
    );
  });

  it('aceita categoria_id igual a 0 (não trata como ausente)', () => {
    expect(validarCamposObrigatoriosMaterial({ ...materialValido, categoria_id: 0 })).toEqual([]);
  });

  it("retorna 'Unidade de medida é obrigatória' quando ausente", () => {
    const { unidade_medida, ...semUnidade } = materialValido;
    expect(validarCamposObrigatoriosMaterial(semUnidade)).toContain(
      'Unidade de medida é obrigatória'
    );
  });

  it('acumula múltiplos erros quando vários campos estão ausentes', () => {
    const erros = validarCamposObrigatoriosMaterial({});
    expect(erros).toHaveLength(4);
  });
});

describe('validarValoresNumericosMaterial', () => {
  it('não retorna erros quando os campos numéricos/data não foram informados', () => {
    expect(validarValoresNumericosMaterial({})).toEqual([]);
  });

  it('não retorna erros com valores válidos', () => {
    const erros = validarValoresNumericosMaterial({
      quantidade: 10,
      estoque_minimo: 5,
      estoque_ideal: 20,
      data_entrada: '2026-06-01',
      validade: '2027-06-01',
    });
    expect(erros).toEqual([]);
  });

  it('rejeita quantidade negativa ou decimal', () => {
    expect(validarValoresNumericosMaterial({ quantidade: -1 })).toContain(
      'Quantidade deve ser um número inteiro maior ou igual a zero'
    );
    expect(validarValoresNumericosMaterial({ quantidade: 2.5 })).toContain(
      'Quantidade deve ser um número inteiro maior ou igual a zero'
    );
  });

  it('rejeita estoque_minimo e estoque_ideal inválidos', () => {
    expect(validarValoresNumericosMaterial({ estoque_minimo: -5 })).toContain(
      'Estoque mínimo deve ser um número inteiro maior ou igual a zero'
    );
    expect(validarValoresNumericosMaterial({ estoque_ideal: 'dez' })).toContain(
      'Estoque ideal deve ser um número inteiro maior ou igual a zero'
    );
  });

  it('rejeita data_entrada e validade com formato inválido', () => {
    expect(validarValoresNumericosMaterial({ data_entrada: 'não-é-uma-data' })).toContain(
      'Data de entrada inválida'
    );
    expect(validarValoresNumericosMaterial({ validade: '31/13/2026/x' })).toContain(
      'Data de validade inválida'
    );
  });

  it('acumula todos os erros quando múltiplos campos são inválidos', () => {
    const erros = validarValoresNumericosMaterial({
      quantidade: -1,
      estoque_minimo: -1,
      estoque_ideal: -1,
      data_entrada: 'invalida',
      validade: 'invalida',
    });
    expect(erros).toHaveLength(5);
  });
});

describe('validarMovimentacao', () => {
  const movimentacaoValida = { material_id: 1, tipo: 'entrada', quantidade: 5 };

  it('não retorna erros para uma movimentação de entrada válida', () => {
    expect(validarMovimentacao(movimentacaoValida)).toEqual([]);
  });

  it('não retorna erros para uma movimentação de saída válida', () => {
    expect(validarMovimentacao({ ...movimentacaoValida, tipo: 'saida' })).toEqual([]);
  });

  it("retorna 'Material é obrigatório' quando material_id está ausente", () => {
    const { material_id, ...semMaterial } = movimentacaoValida;
    expect(validarMovimentacao(semMaterial)).toContain('Material é obrigatório');
  });

  it("retorna erro de tipo quando o tipo não é 'entrada' nem 'saida'", () => {
    expect(validarMovimentacao({ ...movimentacaoValida, tipo: 'transferencia' })).toContain(
      "Tipo deve ser 'entrada' ou 'saida'"
    );
    expect(validarMovimentacao({ ...movimentacaoValida, tipo: '' })).toContain(
      "Tipo deve ser 'entrada' ou 'saida'"
    );
  });

  it('retorna erro de quantidade quando ela é zero, negativa ou decimal', () => {
    expect(validarMovimentacao({ ...movimentacaoValida, quantidade: 0 })).toContain(
      'Quantidade deve ser um número inteiro maior que zero'
    );
    expect(validarMovimentacao({ ...movimentacaoValida, quantidade: -5 })).toContain(
      'Quantidade deve ser um número inteiro maior que zero'
    );
    expect(validarMovimentacao({ ...movimentacaoValida, quantidade: 1.5 })).toContain(
      'Quantidade deve ser um número inteiro maior que zero'
    );
  });

  it('acumula todos os erros quando todos os campos são inválidos', () => {
    const erros = validarMovimentacao({ material_id: null, tipo: 'x', quantidade: -1 });
    expect(erros).toHaveLength(3);
  });
});
