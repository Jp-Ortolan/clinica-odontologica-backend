// Testes: módulo de Estoque (categoria + material + movimentação).
// Mesma estratégia de tests/pacientes.test.js: Supertest chamando a API
// de ponta a ponta, com os repositórios mockados para não depender de
// um banco de dados real.

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/repositories/categoriaRepository');
jest.mock('../src/repositories/materialRepository');
jest.mock('../src/repositories/movimentacaoRepository');

const categoriaRepository = require('../src/repositories/categoriaRepository');
const materialRepository = require('../src/repositories/materialRepository');
const movimentacaoRepository = require('../src/repositories/movimentacaoRepository');
const app = require('../src/app');

function gerarToken(perfil) {
  return jwt.sign(
    { id: 1, nome: 'Usuário Teste', email: 'teste@teste.com', perfil },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const tokenProfessor = gerarToken('professor');
const tokenAluno = gerarToken('aluno');
const tokenRecepcionista = gerarToken('recepcionista');

const categoriaFake = { id: 1, nome: 'Instrumentais' };

const materialFake = {
  id: 1,
  nome: 'Lidocaina',
  codigo_barras: '7891234567890',
  categoria_id: 1,
  unidade_medida: 'frasco',
  quantidade: 10,
  estoque_minimo: 5,
  estoque_ideal: 20,
  fabricante: null,
  lote: null,
  registro_anvisa: null,
  data_entrada: null,
  validade: null,
  categoria_nome: 'Instrumentais',
};

const movimentacaoFake = {
  id: 1,
  material_id: 1,
  usuario_id: 1,
  tipo: 'entrada',
  quantidade: 5,
  observacao: null,
  material_nome: 'Lidocaina',
  usuario_nome: 'Usuário Teste',
};

afterEach(() => jest.clearAllMocks());

describe('GET /api/categorias', () => {
  it('retorna 401 sem token de autenticação', async () => {
    const res = await request(app).get('/api/categorias');
    expect(res.status).toBe(401);
  });

  it('retorna 403 para recepcionista (sem acesso ao estoque)', async () => {
    const res = await request(app)
      .get('/api/categorias')
      .set('Authorization', `Bearer ${tokenRecepcionista}`);
    expect(res.status).toBe(403);
  });

  it('retorna 200 e a lista de categorias para professor/aluno', async () => {
    categoriaRepository.listar.mockResolvedValue([categoriaFake]);

    const res = await request(app)
      .get('/api/categorias')
      .set('Authorization', `Bearer ${tokenAluno}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([categoriaFake]);
  });
});

describe('POST /api/categorias', () => {
  it('retorna 403 quando o perfil não é professor (aluno)', async () => {
    const res = await request(app)
      .post('/api/categorias')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ nome: 'Anestésicos' });

    expect(res.status).toBe(403);
    expect(categoriaRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 400 quando o nome está vazio', async () => {
    const res = await request(app)
      .post('/api/categorias')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ nome: '   ' });

    expect(res.status).toBe(400);
    expect(categoriaRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 409 quando já existe categoria com esse nome', async () => {
    categoriaRepository.buscarPorNome.mockResolvedValue(categoriaFake);

    const res = await request(app)
      .post('/api/categorias')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ nome: 'Instrumentais' });

    expect(res.status).toBe(409);
    expect(categoriaRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 201 ao criar categoria com dados válidos', async () => {
    categoriaRepository.buscarPorNome.mockResolvedValue(null);
    categoriaRepository.criar.mockResolvedValue(categoriaFake);

    const res = await request(app)
      .post('/api/categorias')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ nome: 'Instrumentais' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(categoriaFake);
  });
});

describe('DELETE /api/categorias/:id', () => {
  it('retorna 409 quando a categoria tem materiais vinculados', async () => {
    categoriaRepository.buscarPorId.mockResolvedValue(categoriaFake);
    categoriaRepository.contarMateriaisVinculados.mockResolvedValue(3);

    const res = await request(app)
      .delete('/api/categorias/1')
      .set('Authorization', `Bearer ${tokenProfessor}`);

    expect(res.status).toBe(409);
    expect(categoriaRepository.deletar).not.toHaveBeenCalled();
  });

  it('retorna 200 ao remover categoria sem materiais vinculados', async () => {
    categoriaRepository.buscarPorId.mockResolvedValue(categoriaFake);
    categoriaRepository.contarMateriaisVinculados.mockResolvedValue(0);
    categoriaRepository.deletar.mockResolvedValue({ id: 1 });

    const res = await request(app)
      .delete('/api/categorias/1')
      .set('Authorization', `Bearer ${tokenProfessor}`);

    expect(res.status).toBe(200);
  });
});

describe('GET /api/materiais', () => {
  it('retorna 200 e a lista de materiais com status_estoque calculado', async () => {
    materialRepository.listar.mockResolvedValue([materialFake]);

    const res = await request(app)
      .get('/api/materiais')
      .set('Authorization', `Bearer ${tokenAluno}`);

    expect(res.status).toBe(200);
    expect(res.body[0].status_estoque).toBe('Baixo'); // quantidade(10) <= estoque_ideal(20)
    expect(res.body[0].em_falta).toBe(10);
  });
});

describe('POST /api/materiais', () => {
  it('retorna 403 para recepcionista', async () => {
    const res = await request(app)
      .post('/api/materiais')
      .set('Authorization', `Bearer ${tokenRecepcionista}`)
      .send({ nome: 'Lidocaina' });

    expect(res.status).toBe(403);
    expect(materialRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 400 quando faltam campos obrigatórios (sem código de barras)', async () => {
    const res = await request(app)
      .post('/api/materiais')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ nome: 'Lidocaina', categoria_id: 1, unidade_medida: 'frasco' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/código de barras/i);
    expect(materialRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 400 quando a categoria informada não existe', async () => {
    categoriaRepository.buscarPorId.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/materiais')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({
        nome: 'Lidocaina',
        codigo_barras: '7891234567890',
        categoria_id: 999,
        unidade_medida: 'frasco',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/categoria/i);
    expect(materialRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 409 quando o código de barras já está cadastrado', async () => {
    categoriaRepository.buscarPorId.mockResolvedValue(categoriaFake);
    materialRepository.buscarPorCodigoBarras.mockResolvedValue(materialFake);

    const res = await request(app)
      .post('/api/materiais')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({
        nome: 'Lidocaina',
        codigo_barras: materialFake.codigo_barras,
        categoria_id: 1,
        unidade_medida: 'frasco',
      });

    expect(res.status).toBe(409);
    expect(materialRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 400 quando estoque ideal é menor que o estoque mínimo', async () => {
    categoriaRepository.buscarPorId.mockResolvedValue(categoriaFake);
    materialRepository.buscarPorCodigoBarras.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/materiais')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({
        nome: 'Lidocaina',
        codigo_barras: '7891234567890',
        categoria_id: 1,
        unidade_medida: 'frasco',
        estoque_minimo: 10,
        estoque_ideal: 5,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/estoque ideal/i);
    expect(materialRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 201 ao criar material com dados válidos (aluno)', async () => {
    categoriaRepository.buscarPorId.mockResolvedValue(categoriaFake);
    materialRepository.buscarPorCodigoBarras.mockResolvedValue(null);
    materialRepository.criar.mockResolvedValue(materialFake);

    const res = await request(app)
      .post('/api/materiais')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({
        nome: 'Lidocaina',
        codigo_barras: '7891234567890',
        categoria_id: 1,
        unidade_medida: 'frasco',
        quantidade: 10,
        estoque_minimo: 5,
        estoque_ideal: 20,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(materialFake.id);
    expect(res.body.status_estoque).toBe('Baixo');
  });
});

describe('DELETE /api/materiais/:id', () => {
  it('retorna 403 quando o perfil não é professor (aluno)', async () => {
    const res = await request(app)
      .delete('/api/materiais/1')
      .set('Authorization', `Bearer ${tokenAluno}`);

    expect(res.status).toBe(403);
    expect(materialRepository.deletar).not.toHaveBeenCalled();
  });

  it('retorna 409 quando o material tem movimentações vinculadas', async () => {
    materialRepository.buscarPorId.mockResolvedValue(materialFake);
    materialRepository.contarMovimentacoesVinculadas.mockResolvedValue(2);

    const res = await request(app)
      .delete('/api/materiais/1')
      .set('Authorization', `Bearer ${tokenProfessor}`);

    expect(res.status).toBe(409);
    expect(materialRepository.deletar).not.toHaveBeenCalled();
  });
});

describe('POST /api/movimentacoes', () => {
  it('retorna 403 para recepcionista', async () => {
    const res = await request(app)
      .post('/api/movimentacoes')
      .set('Authorization', `Bearer ${tokenRecepcionista}`)
      .send({ material_id: 1, tipo: 'entrada', quantidade: 5 });

    expect(res.status).toBe(403);
    expect(movimentacaoRepository.criar).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o tipo não é 'entrada' nem 'saida'", async () => {
    const res = await request(app)
      .post('/api/movimentacoes')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ material_id: 1, tipo: 'transferencia', quantidade: 5 });

    expect(res.status).toBe(400);
    expect(movimentacaoRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 400 quando o material informado não existe', async () => {
    materialRepository.buscarPorId.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/movimentacoes')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ material_id: 999, tipo: 'entrada', quantidade: 5 });

    expect(res.status).toBe(400);
    expect(movimentacaoRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 409 quando a saída excede o estoque disponível', async () => {
    materialRepository.buscarPorId.mockResolvedValue(materialFake); // quantidade: 10

    const res = await request(app)
      .post('/api/movimentacoes')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ material_id: 1, tipo: 'saida', quantidade: 50 });

    expect(res.status).toBe(409);
    expect(movimentacaoRepository.criar).not.toHaveBeenCalled();
    expect(materialRepository.ajustarQuantidade).not.toHaveBeenCalled();
  });

  it('retorna 201, registra a movimentação e ajusta o estoque (+) numa entrada', async () => {
    materialRepository.buscarPorId.mockResolvedValue(materialFake); // quantidade: 10
    movimentacaoRepository.criar.mockResolvedValue(movimentacaoFake);
    materialRepository.ajustarQuantidade.mockResolvedValue({ ...materialFake, quantidade: 15 });

    const res = await request(app)
      .post('/api/movimentacoes')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ material_id: 1, tipo: 'entrada', quantidade: 5 });

    expect(res.status).toBe(201);
    expect(movimentacaoRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ material_id: 1, tipo: 'entrada', quantidade: 5 })
    );
    // delta positivo para entrada
    expect(materialRepository.ajustarQuantidade).toHaveBeenCalledWith(1, 5);
  });

  it('retorna 201 e ajusta o estoque (-) numa saída válida', async () => {
    materialRepository.buscarPorId.mockResolvedValue(materialFake); // quantidade: 10
    movimentacaoRepository.criar.mockResolvedValue({ ...movimentacaoFake, tipo: 'saida' });
    materialRepository.ajustarQuantidade.mockResolvedValue({ ...materialFake, quantidade: 7 });

    const res = await request(app)
      .post('/api/movimentacoes')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ material_id: 1, tipo: 'saida', quantidade: 3 });

    expect(res.status).toBe(201);
    // delta negativo para saída
    expect(materialRepository.ajustarQuantidade).toHaveBeenCalledWith(1, -3);
  });
});

describe('GET /api/movimentacoes/:id', () => {
  it('retorna 404 quando a movimentação não existe', async () => {
    movimentacaoRepository.buscarPorId.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/movimentacoes/999')
      .set('Authorization', `Bearer ${tokenAluno}`);

    expect(res.status).toBe(404);
  });

  it('retorna 200 com a movimentação encontrada', async () => {
    movimentacaoRepository.buscarPorId.mockResolvedValue(movimentacaoFake);

    const res = await request(app)
      .get('/api/movimentacoes/1')
      .set('Authorization', `Bearer ${tokenProfessor}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(movimentacaoFake);
  });
});

describe('PUT /api/movimentacoes/:id', () => {
  it('retorna 405 (movimentações são imutáveis por design)', async () => {
    const res = await request(app)
      .put('/api/movimentacoes/1')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ quantidade: 99 });

    expect(res.status).toBe(405);
  });
});
