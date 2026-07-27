// Testes: extensões do módulo de cirurgias — mutirão cirúrgico e
// compartilhamento de cursos (alunos vinculados a uma cirurgia).

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/repositories/cirurgiaRepository');
jest.mock('../src/repositories/pacienteRepository');
jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));

const cirurgiaRepository = require('../src/repositories/cirurgiaRepository');
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

const mutiraoFake = { id: 1, nome: 'Mutirão de Extrações', data_evento: '2026-08-10', local: 'Clínica A' };

describe('Mutirão cirúrgico', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 403 ao criar mutirão sendo aluno', async () => {
    const res = await request(app)
      .post('/api/cirurgias/mutiroes')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send(mutiraoFake);
    expect(res.status).toBe(403);
  });

  it('retorna 400 sem nome ou data', async () => {
    const res = await request(app)
      .post('/api/cirurgias/mutiroes')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ nome: 'Mutirão' });
    expect(res.status).toBe(400);
  });

  it('retorna 201 ao criar mutirão válido', async () => {
    cirurgiaRepository.criarMutirao.mockResolvedValue(mutiraoFake);
    const res = await request(app)
      .post('/api/cirurgias/mutiroes')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send(mutiraoFake);
    expect(res.status).toBe(201);
  });

  it('retorna 200 ao listar mutirões', async () => {
    cirurgiaRepository.listarMutiroes.mockResolvedValue([mutiraoFake]);
    const res = await request(app)
      .get('/api/cirurgias/mutiroes')
      .set('Authorization', `Bearer ${tokenRecepcionista}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([mutiraoFake]);
  });

  it('retorna 404 ao buscar mutirão inexistente', async () => {
    cirurgiaRepository.buscarMutiraoPorId.mockResolvedValue(null);
    const res = await request(app)
      .get('/api/cirurgias/mutiroes/999')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(404);
  });
});

describe('Compartilhamento de cursos (alunos vinculados à cirurgia)', () => {
  afterEach(() => jest.clearAllMocks());

  const cirurgiaFake = { id: 1, paciente_id: 1, usuario_id: 1, tipo_cirurgia: 'Extração' };

  it('retorna 403 ao vincular aluno sendo recepcionista', async () => {
    const res = await request(app)
      .post('/api/cirurgias/1/alunos')
      .set('Authorization', `Bearer ${tokenRecepcionista}`)
      .send({ usuario_id: 2, curso: 'Odontologia' });
    expect(res.status).toBe(403);
  });

  it('retorna 400 sem usuario_id', async () => {
    cirurgiaRepository.buscarPorId.mockResolvedValue(cirurgiaFake);
    const res = await request(app)
      .post('/api/cirurgias/1/alunos')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ curso: 'Odontologia' });
    expect(res.status).toBe(400);
  });

  it('retorna 409 ao vincular aluno já vinculado', async () => {
    cirurgiaRepository.buscarPorId.mockResolvedValue(cirurgiaFake);
    cirurgiaRepository.listarAlunosDaCirurgia.mockResolvedValue([{ id: 1, usuario_id: 2 }]);
    const res = await request(app)
      .post('/api/cirurgias/1/alunos')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ usuario_id: 2, curso: 'Odontologia' });
    expect(res.status).toBe(409);
  });

  it('retorna 201 ao vincular aluno novo', async () => {
    cirurgiaRepository.buscarPorId.mockResolvedValue(cirurgiaFake);
    cirurgiaRepository.listarAlunosDaCirurgia.mockResolvedValue([]);
    cirurgiaRepository.vincularAluno.mockResolvedValue({ id: 1, cirurgia_id: 1, usuario_id: 2, curso: 'Odontologia', papel: 'observador' });
    const res = await request(app)
      .post('/api/cirurgias/1/alunos')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ usuario_id: 2, curso: 'Odontologia' });
    expect(res.status).toBe(201);
  });

  it('retorna 200 ao listar alunos vinculados', async () => {
    cirurgiaRepository.buscarPorId.mockResolvedValue(cirurgiaFake);
    cirurgiaRepository.listarAlunosDaCirurgia.mockResolvedValue([{ id: 1, usuario_id: 2 }]);
    const res = await request(app)
      .get('/api/cirurgias/1/alunos')
      .set('Authorization', `Bearer ${tokenAluno}`);
    expect(res.status).toBe(200);
  });

  it('retorna 404 ao desvincular aluno inexistente', async () => {
    cirurgiaRepository.desvincularAluno.mockResolvedValue(null);
    const res = await request(app)
      .delete('/api/cirurgias/1/alunos/999')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(404);
  });
});
