// Testes: módulo de Estoque (categoria + material + movimentação).
// Mesma estratégia de tests/pacientes.test.js: Supertest chamando a API
// de ponta a ponta, com os repositórios mockados para não depender de
// um banco de dados real.

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({query:jest.fn(),connect:jest.fn()}));
const pool=require('../src/config/database');
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

  it('gera código automaticamente quando a embalagem não possui código', async () => {
    categoriaRepository.buscarPorId.mockResolvedValue(categoriaFake);
    materialRepository.buscarPorCodigoBarras.mockResolvedValue(null);
    materialRepository.criar.mockImplementation(async d=>({id:1,...d}));
    const res=await request(app).post('/api/materiais').set('Authorization', 'Bearer '+tokenAluno).send({nome:'Lidocaina',categoria_id:1,unidade_medida:'frasco'});
    expect(res.status).toBe(201);
    expect(res.body.codigo_barras).toMatch(/^MAT[A-F0-9]{16}$/);
    expect(res.body.quantidade).toBe(0);
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
        quantidade: 0,
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
  it('recusa recepção e campos de entrada incompletos', async()=>{
    const req=perfil=>request(app).post('/api/movimentacoes').set('Authorization','Bearer '+perfil).send({material_id:1,tipo:'entrada',quantidade:5});
    expect((await req(tokenRecepcionista)).status).toBe(403);
    expect((await req(tokenAluno)).status).toBe(400);
  });
  it.each(['entrada','saida'])('movimenta por lote e preserva transação via rota legada: %s',async tipo=>{
    const client={release:jest.fn(),query:jest.fn().mockImplementation(async sql=>({rows:sql.startsWith('SELECT * FROM material WHERE')?[materialFake]:sql.startsWith('SELECT * FROM material_lote')?[{id:3,quantidade:10,validade:'2027-01-01'}]:sql.startsWith('INSERT INTO movimentacao')?[movimentacaoFake]:[]}))};
    pool.connect.mockResolvedValue(client);
    const res=await request(app).post('/api/movimentacoes').set('Authorization','Bearer '+tokenAluno).send({material_id:1,tipo,quantidade:3,lote:'ABC',lote_id:3,validade:'2027-01-01',data_recebimento:'2026-09-10'});
    expect(res.status).toBe(201);
    expect(client.query).toHaveBeenCalledWith('UPDATE material SET quantidade=quantidade+$1 WHERE id=$2',[tipo==='entrada'?3:-3,1]);
    expect(client.query).toHaveBeenLastCalledWith('COMMIT');
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
