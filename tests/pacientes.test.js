// Testes: API de pacientes (autenticação + permissões + CRUD básico)
// Usa Supertest para chamar a API e mocka o repositório
// para não depender de um banco de dados real.

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/repositories/pacienteRepository');
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

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

const pacienteFake = {
  id: 1,
  nome: 'Maria Silva',
  cpf: '12345678900',
  data_nascimento: '1990-01-01',
  telefone: '11999999999',
  email: 'maria@teste.com',
  endereco: 'Rua A, 123',
};

describe('GET /api/pacientes', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 401 sem token de autenticação', async () => {
    const res = await request(app).get('/api/pacientes');
    expect(res.status).toBe(401);
  });

  it('retorna 401 com token inválido', async () => {
    const res = await request(app)
      .get('/api/pacientes')
      .set('Authorization', 'Bearer token_invalido');
    expect(res.status).toBe(401);
  });

  it('retorna 200 e a lista de pacientes para qualquer perfil autenticado', async () => {
    pacienteRepository.listar.mockResolvedValue([pacienteFake]);

    const res = await request(app)
      .get('/api/pacientes')
      .set('Authorization', `Bearer ${tokenAluno}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([pacienteFake]);
  });
});

describe('POST /api/pacientes', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 403 quando o perfil não tem permissão (aluno)', async () => {
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ nome: 'Novo Paciente', cpf: '00000000000', data_nascimento: '2000-01-01' });

    expect(res.status).toBe(403);
    expect(pacienteRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 400 quando faltam campos obrigatórios (recepcionista)', async () => {
    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', `Bearer ${tokenRecepcionista}`)
      .send({ nome: 'Paciente Incompleto' });

    expect(res.status).toBe(400);
  });

  it('retorna 409 quando o CPF já está cadastrado', async () => {
    pacienteRepository.buscarPorCpf.mockResolvedValue(pacienteFake);

    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', `Bearer ${tokenRecepcionista}`)
      .send({ nome: 'Maria Silva', cpf: pacienteFake.cpf, data_nascimento: '1990-01-01' });

    expect(res.status).toBe(409);
    expect(pacienteRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 201 ao criar paciente com dados válidos (recepcionista)', async () => {
    pacienteRepository.buscarPorCpf.mockResolvedValue(null);
    pacienteRepository.criar.mockResolvedValue(pacienteFake);

    const res = await request(app)
      .post('/api/pacientes')
      .set('Authorization', `Bearer ${tokenRecepcionista}`)
      .send({
        nome: pacienteFake.nome,
        cpf: pacienteFake.cpf,
        data_nascimento: pacienteFake.data_nascimento,
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(pacienteFake);
  });
});

describe('DELETE /api/pacientes/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 403 quando o perfil não é professor', async () => {
    const res = await request(app)
      .delete('/api/pacientes/1')
      .set('Authorization', `Bearer ${tokenRecepcionista}`);

    expect(res.status).toBe(403);
    expect(pacienteRepository.deletar).not.toHaveBeenCalled();
  });

  it('retorna 200 ao remover paciente existente (professor)', async () => {
    pacienteRepository.deletar.mockResolvedValue({ id: 1 });

    const res = await request(app)
      .delete('/api/pacientes/1')
      .set('Authorization', `Bearer ${tokenProfessor}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/sucesso/i);
  });

  it('retorna 404 ao tentar remover paciente inexistente (professor)', async () => {
    pacienteRepository.deletar.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/pacientes/999')
      .set('Authorization', `Bearer ${tokenProfessor}`);

    expect(res.status).toBe(404);
  });
});
