// Testes: API de cirurgias (autenticação + permissões + CRUD básico)
// Usa Supertest para chamar a API e mocka os repositórios
// para não depender de um banco de dados real.

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/repositories/cirurgiaRepository');
jest.mock('../src/repositories/pacienteRepository');
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const cirurgiaRepository = require('../src/repositories/cirurgiaRepository');
const pacienteRepository = require('../src/repositories/pacienteRepository');
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

const pacienteFake = { id: 1, nome: 'Maria Silva' };

const cirurgiaFake = {
  id: 1,
  paciente_id: 1,
  usuario_id: 1,
  data_hora: '2026-08-01T10:00:00.000Z',
  tipo_cirurgia: 'Extração',
  status: 'agendada',
  observacoes: null,
};

describe('GET /api/cirurgias', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 401 sem token de autenticação', async () => {
    const res = await request(app).get('/api/cirurgias');
    expect(res.status).toBe(401);
  });

  it('retorna 200 e a lista de cirurgias para qualquer perfil autenticado', async () => {
    cirurgiaRepository.listar.mockResolvedValue([cirurgiaFake]);

    const res = await request(app)
      .get('/api/cirurgias')
      .set('Authorization', `Bearer ${tokenAluno}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([cirurgiaFake]);
  });
});

describe('GET /api/cirurgias/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 404 quando a cirurgia não existe', async () => {
    cirurgiaRepository.buscarPorId.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/cirurgias/999')
      .set('Authorization', `Bearer ${tokenRecepcionista}`);

    expect(res.status).toBe(404);
  });

  it('retorna 200 com a cirurgia encontrada', async () => {
    cirurgiaRepository.buscarPorId.mockResolvedValue(cirurgiaFake);

    const res = await request(app)
      .get('/api/cirurgias/1')
      .set('Authorization', `Bearer ${tokenRecepcionista}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(cirurgiaFake);
  });
});

describe('POST /api/cirurgias', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 403 quando o perfil não tem permissão (recepcionista)', async () => {
    const res = await request(app)
      .post('/api/cirurgias')
      .set('Authorization', `Bearer ${tokenRecepcionista}`)
      .send({ paciente_id: 1, usuario_id: 1, data_hora: '2026-08-01T10:00:00.000Z' });

    expect(res.status).toBe(403);
    expect(cirurgiaRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 400 quando faltam campos obrigatórios (aluno)', async () => {
    const res = await request(app)
      .post('/api/cirurgias')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ paciente_id: 1 });

    expect(res.status).toBe(400);
  });

  it('retorna 400 quando a data/hora é inválida', async () => {
    const res = await request(app)
      .post('/api/cirurgias')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ paciente_id: 1, usuario_id: 1, data_hora: 'data-invalida' });

    expect(res.status).toBe(400);
  });

  it('retorna 404 quando o paciente não existe', async () => {
    pacienteRepository.buscarPorId.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/cirurgias')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ paciente_id: 999, usuario_id: 1, data_hora: '2026-08-01T10:00:00.000Z' });

    expect(res.status).toBe(404);
    expect(cirurgiaRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 201 ao criar cirurgia com dados válidos (professor)', async () => {
    pacienteRepository.buscarPorId.mockResolvedValue(pacienteFake);
    cirurgiaRepository.criar.mockResolvedValue(cirurgiaFake);

    const res = await request(app)
      .post('/api/cirurgias')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({
        paciente_id: cirurgiaFake.paciente_id,
        usuario_id: cirurgiaFake.usuario_id,
        data_hora: cirurgiaFake.data_hora,
        tipo_cirurgia: cirurgiaFake.tipo_cirurgia,
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(cirurgiaFake);
  });
});

describe('PUT /api/cirurgias/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 400 quando o status informado é inválido', async () => {
    cirurgiaRepository.buscarPorId.mockResolvedValue(cirurgiaFake);

    const res = await request(app)
      .put('/api/cirurgias/1')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ status: 'invalido' });

    expect(res.status).toBe(400);
  });

  it('retorna 200 ao atualizar status da cirurgia', async () => {
    cirurgiaRepository.buscarPorId.mockResolvedValue(cirurgiaFake);
    cirurgiaRepository.atualizar.mockResolvedValue({ ...cirurgiaFake, status: 'realizada' });

    const res = await request(app)
      .put('/api/cirurgias/1')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ status: 'realizada' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('realizada');
  });
});

describe('DELETE /api/cirurgias/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 403 quando o perfil não é professor', async () => {
    const res = await request(app)
      .delete('/api/cirurgias/1')
      .set('Authorization', `Bearer ${tokenAluno}`);

    expect(res.status).toBe(403);
    expect(cirurgiaRepository.deletar).not.toHaveBeenCalled();
  });

  it('retorna 200 ao remover cirurgia existente (professor)', async () => {
    cirurgiaRepository.deletar.mockResolvedValue({ id: 1 });

    const res = await request(app)
      .delete('/api/cirurgias/1')
      .set('Authorization', `Bearer ${tokenProfessor}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/sucesso/i);
  });

  it('retorna 404 ao tentar remover cirurgia inexistente (professor)', async () => {
    cirurgiaRepository.deletar.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/cirurgias/999')
      .set('Authorization', `Bearer ${tokenProfessor}`);

    expect(res.status).toBe(404);
  });
});
