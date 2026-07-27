// Testes: GET /api/logs — leitura dos eventos de auditoria (Winston)
// já gravados em logs/audit.log.

const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');

// Não usamos jest.mock('fs') (automock) porque isso também troca o fs
// usado internamente pelo bcrypt/node-pre-gyp ao localizar seu binário
// nativo, quebrando o require em outros módulos. Em vez disso, espiamos
// só as duas funções que o logService realmente usa.
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

const linha1 = JSON.stringify({ level: 'info', message: 'Paciente cadastrado', timestamp: '2026-07-25 10:00:00' });
const linha2 = JSON.stringify({ level: 'warn', message: 'Consulta cancelada', timestamp: '2026-07-25 11:00:00' });

describe('GET /api/logs', () => {
  afterEach(() => jest.restoreAllMocks());

  it('retorna 403 para perfil aluno (só professor acessa)', async () => {
    const res = await request(app)
      .get('/api/logs')
      .set('Authorization', `Bearer ${tokenAluno}`);
    expect(res.status).toBe(403);
  });

  it('retorna array vazio quando o arquivo de log ainda não existe', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const res = await request(app)
      .get('/api/logs')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('retorna os eventos mais recentes primeiro', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readFileSync').mockReturnValue(`${linha1}\n${linha2}\n`);
    const res = await request(app)
      .get('/api/logs')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].message).toBe('Consulta cancelada');
  });

  it('filtra por nível quando "nivel" é informado', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readFileSync').mockReturnValue(`${linha1}\n${linha2}\n`);
    const res = await request(app)
      .get('/api/logs?nivel=warn')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].level).toBe('warn');
  });

  it('retorna 400 com nível inválido', async () => {
    const res = await request(app)
      .get('/api/logs?nivel=critico')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(400);
  });

  it('ignora linhas corrompidas sem quebrar', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readFileSync').mockReturnValue(`${linha1}\nlinha-invalida-nao-json\n`);
    const res = await request(app)
      .get('/api/logs')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});
