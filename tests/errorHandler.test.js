// Testes: tratamento central de erros (não vazar detalhes internos)

const express = require('express');
const request = require('supertest');
const errorHandler = require('../src/middlewares/errorHandler');
const app = require('../src/app');

function appQueLanca(erro) {
  const a = express();
  a.use(express.json());
  a.post('/x', () => { throw erro; });
  a.use(errorHandler);
  return a;
}

it('erro inesperado vira 500 com mensagem genérica (sem SQL/stack)', async () => {
  const res = await request(appQueLanca(new Error('relation "usuario" does not exist')))
    .post('/x');
  expect(res.status).toBe(500);
  expect(res.body.message).toBe('Erro interno do servidor');
  expect(JSON.stringify(res.body)).not.toMatch(/relation|usuario/);
});

it('erro de negócio (4xx) mantém a mensagem original', async () => {
  const res = await request(appQueLanca({ status: 409, message: 'Estoque insuficiente' })).post('/x');
  expect(res.status).toBe(409);
  expect(res.body.message).toBe('Estoque insuficiente');
});

it.each([
  ['23505', 409],
  ['23503', 409],
  ['23514', 400],
  ['22P02', 400],
])('erro do PostgreSQL %s vira %i com texto amigável', async (code, status) => {
  const erro = Object.assign(new Error('detalhe interno do banco'), { code });
  const res = await request(appQueLanca(erro)).post('/x');
  expect(res.status).toBe(status);
  expect(res.body.message).not.toMatch(/detalhe interno/);
});

it('JSON malformado responde 400', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{"email": ');
  expect(res.status).toBe(400);
});

it('rota inexistente responde 404 em JSON', async () => {
  const res = await request(app).get('/api/nao-existe');
  expect(res.status).toBe(404);
  expect(res.body.message).toMatch(/não encontrada/i);
});

it('/metrics exige login de professor/coordenador', async () => {
  const res = await request(app).get('/metrics');
  expect(res.status).toBe(401);
});

it('CORS não libera origem desconhecida', async () => {
  const res = await request(app).get('/health').set('Origin', 'https://site-qualquer.com');
  expect(res.headers['access-control-allow-origin']).toBeUndefined();
});
