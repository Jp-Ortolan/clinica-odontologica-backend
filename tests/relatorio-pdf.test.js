// Testes: GET /api/dashboard/relatorio-pdf

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/repositories/dashboardRepository');

const dashboardRepository = require('../src/repositories/dashboardRepository');
const app = require('../src/app');

function gerarToken(perfil) {
  return jwt.sign(
    { id: 1, nome: 'Usuário Teste', email: 'teste@teste.com', perfil },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function mockarContagens() {
  dashboardRepository.contarPacientesAtivos.mockResolvedValue(10);
  dashboardRepository.contarConsultasHoje.mockResolvedValue(4);
  dashboardRepository.contarConsultasPorStatusHoje.mockResolvedValue([{ status: 'agendada', total: 4 }]);
  dashboardRepository.contarCirurgiasHoje.mockResolvedValue(1);
  dashboardRepository.contarMateriaisEstoqueCritico.mockResolvedValue(2);
  dashboardRepository.contarEsterilizacoesPendentes.mockResolvedValue(0);
}

describe('GET /api/dashboard/relatorio-pdf', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/dashboard/relatorio-pdf');
    expect(res.status).toBe(401);
  });

  it('retorna 403 para recepcionista', async () => {
    const token = gerarToken('recepcionista');
    const res = await request(app)
      .get('/api/dashboard/relatorio-pdf')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('retorna um PDF válido para professor', async () => {
    mockarContagens();
    const token = gerarToken('professor');
    const res = await request(app)
      .get('/api/dashboard/relatorio-pdf')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('relatorio-dashboard.pdf');
  });

  it('retorna um PDF válido para aluno', async () => {
    mockarContagens();
    const token = gerarToken('aluno');
    const res = await request(app)
      .get('/api/dashboard/relatorio-pdf')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });
});
