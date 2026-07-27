// Testes: GET /api/permissoes — matriz de permissões (tela "Permissões")

const request = require('supertest');
const jwt = require('jsonwebtoken');

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

describe('GET /api/permissoes', () => {
  it('retorna 403 para perfil aluno', async () => {
    const res = await request(app)
      .get('/api/permissoes')
      .set('Authorization', `Bearer ${tokenAluno}`);
    expect(res.status).toBe(403);
  });

  it('retorna a matriz completa para professor', async () => {
    const res = await request(app)
      .get('/api/permissoes')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.find((m) => m.modulo === 'pacientes')).toBeTruthy();
  });

  it('filtra por perfil quando ?perfil= é informado', async () => {
    const res = await request(app)
      .get('/api/permissoes?perfil=recepcionista')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(200);
    // recepcionista não deve aparecer em módulos que ela não acessa (ex.: materiais)
    expect(res.body.find((m) => m.modulo === 'materiais')).toBeUndefined();
    expect(res.body.find((m) => m.modulo === 'pacientes')).toBeTruthy();
  });
});
