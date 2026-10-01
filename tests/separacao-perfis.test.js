const request = require('supertest');
const jwt = require('jsonwebtoken');
jest.mock('../src/repositories/usuarioRepository');
jest.mock('../src/repositories/consultaRepository');
const usuarios = require('../src/repositories/usuarioRepository');
const consultas = require('../src/repositories/consultaRepository');
const app = require('../src/app');
const { obterPorPerfil } = require('../src/config/permissoes');
const token = perfil => jwt.sign({ id: 1, perfil }, process.env.JWT_SECRET);

beforeEach(() => jest.clearAllMocks());

test.each([
  ['get', '/api/usuarios'], ['post', '/api/usuarios'], ['put', '/api/usuarios/2'],
  ['delete', '/api/usuarios/2'], ['get', '/api/logs'], ['get', '/api/permissoes'],
])('professor recebe 403 em %s %s, mesmo chamando diretamente a API', async (method, path) => {
  const res = await request(app)[method](path).set('Authorization', `Bearer ${token('professor')}`).send({ perfil: 'coordenador' });
  expect(res.status).toBe(403);
});

test('coordenador consulta usuários e permissões administrativas', async () => {
  usuarios.listar.mockResolvedValue([]);
  for (const path of ['/api/usuarios', '/api/permissoes']) {
    const res = await request(app).get(path).set('Authorization', `Bearer ${token('coordenador')}`);
    expect(res.status).toBe(200);
  }
});

test.each(['professor', 'coordenador'])('%s acessa agenda e diretório clínico sem CPF e e-mail', async perfil => {
  consultas.listar.mockResolvedValue([]);
  usuarios.listar.mockResolvedValue([{ id: 2, nome: 'Teste', perfil: 'professor', ativo: true, cpf: 'privado', email: 'privado' }]);
  const agenda = await request(app).get('/api/consultas').set('Authorization', `Bearer ${token(perfil)}`);
  expect(agenda.status).toBe(200);
  const res = await request(app).get('/api/usuarios/profissionais').set('Authorization', `Bearer ${token(perfil)}`);
  expect(res.status).toBe(200);
  expect(res.body).toEqual([{ id: 2, nome: 'Teste', perfil: 'professor', ativo: true }]);
});

test('matriz reserva administração ao coordenador', () => {
  expect(obterPorPerfil('professor').map(m => m.modulo)).not.toContain('usuarios');
  expect(obterPorPerfil('professor').map(m => m.modulo)).not.toContain('logs');
  expect(obterPorPerfil('coordenador').map(m => m.modulo)).toContain('usuarios');
});
