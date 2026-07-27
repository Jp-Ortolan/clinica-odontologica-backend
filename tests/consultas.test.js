// Testes: API de consultas (autenticação + permissões + CRUD básico)
// Usa Supertest para chamar a API e mocka os repositórios
// para não depender de um banco de dados real.

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/repositories/consultaRepository');
jest.mock('../src/repositories/pacienteRepository');
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const consultaRepository = require('../src/repositories/consultaRepository');
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

const consultaFake = {
  id: 1,
  paciente_id: 1,
  usuario_id: 1,
  data_hora: '2026-08-01T10:00:00.000Z',
  queixa_principal: 'Dor de dente',
  observacoes: null,
  status: 'agendada',
};

describe('GET /api/consultas', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 401 sem token de autenticação', async () => {
    const res = await request(app).get('/api/consultas');
    expect(res.status).toBe(401);
  });

  it('retorna 200 e a lista de consultas para qualquer perfil autenticado', async () => {
    consultaRepository.listar.mockResolvedValue([consultaFake]);

    const res = await request(app)
      .get('/api/consultas')
      .set('Authorization', `Bearer ${tokenAluno}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([consultaFake]);
  });
});

describe('GET /api/consultas/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 404 quando a consulta não existe', async () => {
    consultaRepository.buscarPorId.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/consultas/999')
      .set('Authorization', `Bearer ${tokenRecepcionista}`);

    expect(res.status).toBe(404);
  });

  it('retorna 200 com a consulta encontrada', async () => {
    consultaRepository.buscarPorId.mockResolvedValue(consultaFake);

    const res = await request(app)
      .get('/api/consultas/1')
      .set('Authorization', `Bearer ${tokenRecepcionista}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(consultaFake);
  });
});

describe('POST /api/consultas', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 403 quando o perfil não tem permissão (recepcionista)', async () => {
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokenRecepcionista}`)
      .send({ paciente_id: 1, usuario_id: 1, data_hora: '2026-08-01T10:00:00.000Z' });

    expect(res.status).toBe(403);
    expect(consultaRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 400 quando faltam campos obrigatórios (aluno)', async () => {
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ paciente_id: 1 });

    expect(res.status).toBe(400);
  });

  it('retorna 400 quando a data/hora é inválida', async () => {
    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ paciente_id: 1, usuario_id: 1, data_hora: 'data-invalida' });

    expect(res.status).toBe(400);
  });

  it('retorna 404 quando o paciente não existe', async () => {
    pacienteRepository.buscarPorId.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ paciente_id: 999, usuario_id: 1, data_hora: '2026-08-01T10:00:00.000Z' });

    expect(res.status).toBe(404);
    expect(consultaRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 201 ao criar consulta com dados válidos (professor)', async () => {
    pacienteRepository.buscarPorId.mockResolvedValue(pacienteFake);
    consultaRepository.criar.mockResolvedValue(consultaFake);

    const res = await request(app)
      .post('/api/consultas')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({
        paciente_id: consultaFake.paciente_id,
        usuario_id: consultaFake.usuario_id,
        data_hora: consultaFake.data_hora,
        queixa_principal: consultaFake.queixa_principal,
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(consultaFake);
  });
});

describe('PUT /api/consultas/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 400 quando o status informado é inválido', async () => {
    consultaRepository.buscarPorId.mockResolvedValue(consultaFake);

    const res = await request(app)
      .put('/api/consultas/1')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ status: 'invalido' });

    expect(res.status).toBe(400);
  });

  it('retorna 200 ao atualizar status da consulta', async () => {
    consultaRepository.buscarPorId.mockResolvedValue(consultaFake);
    consultaRepository.atualizar.mockResolvedValue({ ...consultaFake, status: 'realizada' });

    const res = await request(app)
      .put('/api/consultas/1')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ status: 'realizada' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('realizada');
  });

  it.each(['confirmada', 'aguardando', 'em_atendimento', 'faltou'])(
    'aceita o novo status "%s"',
    async (status) => {
      consultaRepository.buscarPorId.mockResolvedValue(consultaFake);
      consultaRepository.atualizar.mockResolvedValue({ ...consultaFake, status });

      const res = await request(app)
        .put('/api/consultas/1')
        .set('Authorization', `Bearer ${tokenProfessor}`)
        .send({ status });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }
  );
});

describe('GET /api/consultas?status=', () => {
  afterEach(() => jest.clearAllMocks());

  it('repassa o filtro de status para o repository', async () => {
    consultaRepository.listar.mockResolvedValue([consultaFake]);
    const res = await request(app)
      .get('/api/consultas?status=aguardando')
      .set('Authorization', `Bearer ${tokenRecepcionista}`);
    expect(res.status).toBe(200);
    expect(consultaRepository.listar).toHaveBeenCalledWith({ status: 'aguardando' });
  });

  it('retorna 400 com status de filtro inválido', async () => {
    const res = await request(app)
      .get('/api/consultas?status=inexistente')
      .set('Authorization', `Bearer ${tokenRecepcionista}`);
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/consultas/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 403 quando o perfil não é professor', async () => {
    const res = await request(app)
      .delete('/api/consultas/1')
      .set('Authorization', `Bearer ${tokenAluno}`);

    expect(res.status).toBe(403);
    expect(consultaRepository.deletar).not.toHaveBeenCalled();
  });

  it('retorna 200 ao remover consulta existente (professor)', async () => {
    consultaRepository.deletar.mockResolvedValue({ id: 1 });

    const res = await request(app)
      .delete('/api/consultas/1')
      .set('Authorization', `Bearer ${tokenProfessor}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/sucesso/i);
  });

  it('retorna 404 ao tentar remover consulta inexistente (professor)', async () => {
    consultaRepository.deletar.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/consultas/999')
      .set('Authorization', `Bearer ${tokenProfessor}`);

    expect(res.status).toBe(404);
  });
});
