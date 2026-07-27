// Testes: autenticação (login)
// Usa Supertest para chamar a API e mocka o repositório/bcrypt
// para não depender de um banco de dados real.

const request = require('supertest');

jest.mock('../src/repositories/authRepository');
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const bcrypt = require('bcrypt');
const authRepository = require('../src/repositories/authRepository');
const app = require('../src/app');

const usuarioFake = {
  id: 1,
  nome: 'Professor Teste',
  email: 'professor@teste.com',
  senha_hash: 'hash_qualquer',
  perfil: 'professor',
  setor: 'Odontologia',
};

describe('POST /api/auth/login', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('retorna 200 e um token quando email e senha são válidos', async () => {
    authRepository.findByEmail.mockResolvedValue(usuarioFake);
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'professor@teste.com', senha: '123456' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.usuario).toMatchObject({
      id: usuarioFake.id,
      email: usuarioFake.email,
      perfil: usuarioFake.perfil,
    });
    // a senha/hash nunca deve voltar na resposta
    expect(res.body.usuario.senha_hash).toBeUndefined();
  });

  it('retorna 401 quando a senha está incorreta', async () => {
    authRepository.findByEmail.mockResolvedValue(usuarioFake);
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'professor@teste.com', senha: 'senha_errada' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/inválid/i);
  });

  it('retorna 401 quando o usuário não existe', async () => {
    authRepository.findByEmail.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'naoexiste@teste.com', senha: '123456' });

    expect(res.status).toBe(401);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('retorna 400 quando email ou senha não são informados', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'professor@teste.com' });

    expect(res.status).toBe(400);
    expect(authRepository.findByEmail).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/recuperar-senha', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 400 sem email', async () => {
    const res = await request(app).post('/api/auth/recuperar-senha').send({});
    expect(res.status).toBe(400);
  });

  it('retorna 200 com token quando o e-mail existe', async () => {
    authRepository.findByEmail.mockResolvedValue(usuarioFake);
    authRepository.salvarTokenRecuperacao.mockResolvedValue();

    const res = await request(app)
      .post('/api/auth/recuperar-senha')
      .send({ email: usuarioFake.email });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reset_token');
    expect(authRepository.salvarTokenRecuperacao).toHaveBeenCalled();
  });

  it('retorna 200 sem revelar se o e-mail não existe (evita enumeração)', async () => {
    authRepository.findByEmail.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/recuperar-senha')
      .send({ email: 'ninguem@teste.com' });

    expect(res.status).toBe(200);
    expect(res.body.reset_token).toBeUndefined();
  });
});

describe('POST /api/auth/redefinir-senha', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 400 sem token ou nova senha', async () => {
    const res = await request(app).post('/api/auth/redefinir-senha').send({});
    expect(res.status).toBe(400);
  });

  it('retorna 400 com senha muito curta', async () => {
    const res = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ token: 'abc', nova_senha: '123' });
    expect(res.status).toBe(400);
  });

  it('retorna 401 com token inválido', async () => {
    authRepository.findByResetToken.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ token: 'invalido', nova_senha: 'novaSenha123' });
    expect(res.status).toBe(401);
  });

  it('retorna 401 com token expirado', async () => {
    authRepository.findByResetToken.mockResolvedValue({
      ...usuarioFake,
      reset_token_expires: new Date(Date.now() - 1000 * 60), // expirou há 1 minuto
    });
    const res = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ token: 'expirado', nova_senha: 'novaSenha123' });
    expect(res.status).toBe(401);
  });

  it('retorna 200 e redefine a senha com token válido', async () => {
    authRepository.findByResetToken.mockResolvedValue({
      ...usuarioFake,
      reset_token_expires: new Date(Date.now() + 1000 * 60 * 30), // válido por mais 30min
    });
    authRepository.redefinirSenha.mockResolvedValue();
    bcrypt.hash.mockResolvedValue('novo_hash');

    const res = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ token: 'valido', nova_senha: 'novaSenha123' });

    expect(res.status).toBe(200);
    expect(authRepository.redefinirSenha).toHaveBeenCalledWith(usuarioFake.id, 'novo_hash');
  });
});
