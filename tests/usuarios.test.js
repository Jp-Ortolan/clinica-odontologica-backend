// Testes: API de usuários (autenticação + permissões + CRUD).

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/repositories/usuarioRepository');
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hash_fake'),
}));

const usuarioRepository = require('../src/repositories/usuarioRepository');
const app = require('../src/app');

function gerarToken(perfil, id = 1) {
  return jwt.sign(
    { id, nome: 'Usuário Teste', email: 'teste@teste.com', perfil },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const tokenProfessor = gerarToken('professor', 1);
const tokenAluno = gerarToken('aluno', 2);
const tokenRecepcionista = gerarToken('recepcionista', 3);

const usuarioFake = {
  id: 10,
  nome: 'Carlos Eduardo',
  cpf: '11122233344',
  email: 'carlos@clinica.com',
  telefone: '(41) 98888-0000',
  setor: 'Odontologia',
  perfil: 'professor',
  data_admissao: '2026-01-01',
  ativo: true,
};

describe('GET /api/usuarios', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 401 sem token de autenticação', async () => {
    const res = await request(app).get('/api/usuarios');
    expect(res.status).toBe(401);
  });

  it('retorna 403 quando o perfil não tem permissão (aluno)', async () => {
    const res = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAluno}`);
    expect(res.status).toBe(403);
  });

  it('retorna 200 e a lista de usuários (professor)', async () => {
    usuarioRepository.listar.mockResolvedValue([usuarioFake]);

    const res = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${tokenProfessor}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([usuarioFake]);
  });
});

describe('POST /api/usuarios', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 403 quando o perfil não é professor (recepcionista)', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenRecepcionista}`)
      .send({ nome: 'Novo', cpf: '00000000000', email: 'novo@clinica.com', senha: 'senha123', perfil: 'aluno' });

    expect(res.status).toBe(403);
    expect(usuarioRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 400 quando faltam campos obrigatórios', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ nome: 'Usuário Incompleto' });

    expect(res.status).toBe(400);
  });

  it('retorna 400 quando o perfil é inválido', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({
        nome: 'Alguém', cpf: '99999999999', email: 'alguem@clinica.com',
        senha: 'senha123', perfil: 'gerente',
      });

    expect(res.status).toBe(400);
  });

  it('retorna 409 quando o e-mail já está cadastrado', async () => {
    usuarioRepository.buscarPorEmail.mockResolvedValue({ id: 1 });

    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({
        nome: usuarioFake.nome, cpf: usuarioFake.cpf, email: usuarioFake.email,
        senha: 'senha123', perfil: 'professor',
      });

    expect(res.status).toBe(409);
    expect(usuarioRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 201 ao criar usuário com dados válidos (professor)', async () => {
    usuarioRepository.buscarPorEmail.mockResolvedValue(null);
    usuarioRepository.buscarPorCpf.mockResolvedValue(null);
    usuarioRepository.criar.mockResolvedValue(usuarioFake);

    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({
        nome: usuarioFake.nome,
        cpf: usuarioFake.cpf,
        email: usuarioFake.email,
        senha: 'senha123',
        perfil: 'professor',
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(usuarioFake);
  });
});

describe('DELETE /api/usuarios/:id', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 403 quando o perfil não é professor', async () => {
    const res = await request(app)
      .delete('/api/usuarios/10')
      .set('Authorization', `Bearer ${tokenRecepcionista}`);

    expect(res.status).toBe(403);
    expect(usuarioRepository.deletar).not.toHaveBeenCalled();
  });

  it('retorna 400 ao tentar excluir a própria conta', async () => {
    const res = await request(app)
      .delete('/api/usuarios/1')
      .set('Authorization', `Bearer ${tokenProfessor}`);

    expect(res.status).toBe(400);
    expect(usuarioRepository.deletar).not.toHaveBeenCalled();
  });

  it('retorna 200 ao remover outro usuário (professor)', async () => {
    usuarioRepository.deletar.mockResolvedValue({ id: 10 });

    const res = await request(app)
      .delete('/api/usuarios/10')
      .set('Authorization', `Bearer ${tokenProfessor}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/sucesso/i);
  });

  it('retorna 404 ao tentar remover usuário inexistente', async () => {
    usuarioRepository.deletar.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/usuarios/999')
      .set('Authorization', `Bearer ${tokenProfessor}`);

    expect(res.status).toBe(404);
  });
});
