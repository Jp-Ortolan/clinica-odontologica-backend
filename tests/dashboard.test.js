// Testes: GET /api/dashboard/resumo (Sprint 5 — telas de Dashboard)

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

const tokenProfessor = gerarToken('professor');
const tokenAluno = gerarToken('aluno');
const tokenRecepcionista = gerarToken('recepcionista');

function mockarContagens() {
  dashboardRepository.contarPacientesAtivos.mockResolvedValue(42);
  dashboardRepository.contarConsultasHoje.mockResolvedValue(5);
  dashboardRepository.contarConsultasPorStatusHoje.mockResolvedValue([{ status: 'agendada', total: 5 }]);
  dashboardRepository.contarCirurgiasHoje.mockResolvedValue(2);
  dashboardRepository.contarMateriaisEstoqueCritico.mockResolvedValue(3);
  dashboardRepository.contarEsterilizacoesPendentes.mockResolvedValue(1);
}

describe('GET /api/dashboard/resumo', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 403 para recepcionista', async () => {
    const res = await request(app)
      .get('/api/dashboard/resumo')
      .set('Authorization', `Bearer ${tokenRecepcionista}`);
    expect(res.status).toBe(403);
  });

  it('retorna resumo completo para professor', async () => {
    mockarContagens();
    const res = await request(app)
      .get('/api/dashboard/resumo')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(200);
    expect(res.body.pacientes_ativos).toBe(42);
    expect(res.body.materiais_estoque_critico).toBe(3);
    expect(res.body.esterilizacoes_pendentes).toBe(1);
  });

  it('omite estoque/esterilização no resumo do aluno', async () => {
    mockarContagens();
    const res = await request(app)
      .get('/api/dashboard/resumo')
      .set('Authorization', `Bearer ${tokenAluno}`);
    expect(res.status).toBe(200);
    expect(res.body.consultas_hoje).toBe(5);
    expect(res.body.materiais_estoque_critico).toBeUndefined();
    expect(res.body.esterilizacoes_pendentes).toBeUndefined();
  });
});
