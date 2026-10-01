// Testes: GET /api/logs — eventos de auditoria (tabela log_auditoria)

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/repositories/logRepository');
const logRepository = require('../src/repositories/logRepository');
const app = require('../src/app');

function gerarToken(perfil) {
  return jwt.sign(
    { id: 1, nome: 'Usuário Teste', email: 'teste@teste.com', perfil },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const tokenProfessor = gerarToken('professor');
const tokenCoordenador = gerarToken('coordenador');
const tokenAluno = gerarToken('aluno');

const eventos = [
  { level: 'warn', message: 'Consulta cancelada', timestamp: '2026-07-25 11:00:00' },
  { level: 'info', message: 'Paciente cadastrado', timestamp: '2026-07-25 10:00:00' },
];

describe('GET /api/logs', () => {
  afterEach(() => jest.clearAllMocks());

  it.each([['aluno', tokenAluno], ['professor', tokenProfessor]])('retorna 403 para %s (só a coordenação acessa)', async (_, token) => {
    const res = await request(app).get('/api/logs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(logRepository.listar).not.toHaveBeenCalled();
  });

  it('retorna os eventos no formato da tela (level, message, timestamp)', async () => {
    logRepository.listar.mockResolvedValue(eventos);
    const res = await request(app).get('/api/logs').set('Authorization', `Bearer ${tokenCoordenador}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(eventos);
    expect(logRepository.listar).toHaveBeenCalledWith({ nivel: undefined, limite: 100 });
  });

  it('repassa o filtro de nível e limita a 500 eventos', async () => {
    logRepository.listar.mockResolvedValue([]);
    await request(app).get('/api/logs?nivel=warn&limite=9999').set('Authorization', `Bearer ${tokenCoordenador}`);
    expect(logRepository.listar).toHaveBeenCalledWith({ nivel: 'warn', limite: 500 });
  });

  it('retorna 400 com nível inválido', async () => {
    const res = await request(app).get('/api/logs?nivel=critico').set('Authorization', `Bearer ${tokenCoordenador}`);
    expect(res.status).toBe(400);
  });

  it('retorna 400 com limite inválido', async () => {
    const res = await request(app).get('/api/logs?limite=abc').set('Authorization', `Bearer ${tokenCoordenador}`);
    expect(res.status).toBe(400);
  });
});
