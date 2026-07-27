// Testes: extensões do módulo de pacientes — status ativo/inativo,
// alergias, medicamentos, documentos e evolução.

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/repositories/pacienteRepository');
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const pacienteRepository = require('../src/repositories/pacienteRepository');
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

const pacienteFake = {
  id: 1,
  nome: 'Maria Silva',
  cpf: '12345678900',
  data_nascimento: '1990-01-01',
  ativo: true,
};

describe('PATCH /api/pacientes/:id/status', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 403 quando o perfil é aluno', async () => {
    const res = await request(app)
      .patch('/api/pacientes/1/status')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ ativo: false });
    expect(res.status).toBe(403);
  });

  it('retorna 400 quando "ativo" não é boolean', async () => {
    pacienteRepository.buscarPorId.mockResolvedValue(pacienteFake);
    const res = await request(app)
      .patch('/api/pacientes/1/status')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ ativo: 'nao' });
    expect(res.status).toBe(400);
  });

  it('retorna 200 ao inativar paciente', async () => {
    pacienteRepository.buscarPorId.mockResolvedValue(pacienteFake);
    pacienteRepository.atualizarStatusAtivo.mockResolvedValue({ ...pacienteFake, ativo: false });

    const res = await request(app)
      .patch('/api/pacientes/1/status')
      .set('Authorization', `Bearer ${tokenRecepcionista}`)
      .send({ ativo: false });

    expect(res.status).toBe(200);
    expect(res.body.ativo).toBe(false);
  });

  it('retorna 404 quando o paciente não existe', async () => {
    pacienteRepository.buscarPorId.mockResolvedValue(null);
    const res = await request(app)
      .patch('/api/pacientes/999/status')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ ativo: false });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/pacientes?ativo=', () => {
  afterEach(() => jest.clearAllMocks());

  it('repassa o filtro ativo=true para o repository', async () => {
    pacienteRepository.listar.mockResolvedValue([pacienteFake]);
    const res = await request(app)
      .get('/api/pacientes?ativo=true')
      .set('Authorization', `Bearer ${tokenAluno}`);
    expect(res.status).toBe(200);
    expect(pacienteRepository.listar).toHaveBeenCalledWith({ ativo: true });
  });
});

describe('Alergias', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 400 ao criar alergia sem substância', async () => {
    pacienteRepository.buscarPorId.mockResolvedValue(pacienteFake);
    const res = await request(app)
      .post('/api/pacientes/1/alergias')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ gravidade: 'leve' });
    expect(res.status).toBe(400);
  });

  it('retorna 400 com gravidade inválida', async () => {
    pacienteRepository.buscarPorId.mockResolvedValue(pacienteFake);
    const res = await request(app)
      .post('/api/pacientes/1/alergias')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ substancia: 'Dipirona', gravidade: 'extrema' });
    expect(res.status).toBe(400);
  });

  it('retorna 201 ao criar alergia válida', async () => {
    pacienteRepository.buscarPorId.mockResolvedValue(pacienteFake);
    pacienteRepository.criarAlergia.mockResolvedValue({ id: 1, paciente_id: 1, substancia: 'Dipirona', gravidade: 'grave' });
    const res = await request(app)
      .post('/api/pacientes/1/alergias')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ substancia: 'Dipirona', gravidade: 'grave' });
    expect(res.status).toBe(201);
  });

  it('retorna 404 ao remover alergia inexistente', async () => {
    pacienteRepository.deletarAlergia.mockResolvedValue(null);
    const res = await request(app)
      .delete('/api/pacientes/1/alergias/999')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(404);
  });
});

describe('Medicamentos', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 400 ao criar medicamento sem nome', async () => {
    pacienteRepository.buscarPorId.mockResolvedValue(pacienteFake);
    const res = await request(app)
      .post('/api/pacientes/1/medicamentos')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ dosagem: '500mg' });
    expect(res.status).toBe(400);
  });

  it('retorna 201 ao criar medicamento válido', async () => {
    pacienteRepository.buscarPorId.mockResolvedValue(pacienteFake);
    pacienteRepository.criarMedicamento.mockResolvedValue({ id: 1, paciente_id: 1, nome_medicamento: 'Losartana', dosagem: '50mg' });
    const res = await request(app)
      .post('/api/pacientes/1/medicamentos')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ nome_medicamento: 'Losartana', dosagem: '50mg' });
    expect(res.status).toBe(201);
  });
});

describe('Documentos', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 400 sem conteúdo base64', async () => {
    pacienteRepository.buscarPorId.mockResolvedValue(pacienteFake);
    const res = await request(app)
      .post('/api/pacientes/1/documentos')
      .set('Authorization', `Bearer ${tokenRecepcionista}`)
      .send({ nome_arquivo: 'exame.pdf' });
    expect(res.status).toBe(400);
  });

  it('retorna 201 ao enviar documento válido', async () => {
    pacienteRepository.buscarPorId.mockResolvedValue(pacienteFake);
    pacienteRepository.criarDocumento.mockResolvedValue({
      id: 1, paciente_id: 1, usuario_id: 1, nome_arquivo: 'exame.pdf', tipo_arquivo: 'application/pdf', tamanho_bytes: 4,
    });
    const res = await request(app)
      .post('/api/pacientes/1/documentos')
      .set('Authorization', `Bearer ${tokenRecepcionista}`)
      .send({ nome_arquivo: 'exame.pdf', tipo_arquivo: 'application/pdf', conteudo_base64: Buffer.from('teste').toString('base64') });
    expect(res.status).toBe(201);
  });

  it('retorna 404 ao baixar documento inexistente', async () => {
    pacienteRepository.buscarDocumentoPorId.mockResolvedValue(null);
    const res = await request(app)
      .get('/api/pacientes/1/documentos/999/download')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(404);
  });

  it('retorna o binário ao baixar documento existente', async () => {
    pacienteRepository.buscarDocumentoPorId.mockResolvedValue({
      id: 1, nome_arquivo: 'exame.pdf', tipo_arquivo: 'application/pdf', conteudo: Buffer.from('conteudo-teste'),
    });
    const res = await request(app)
      .get('/api/pacientes/1/documentos/1/download')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });

  it('retorna 403 ao tentar remover documento sendo recepcionista', async () => {
    const res = await request(app)
      .delete('/api/pacientes/1/documentos/1')
      .set('Authorization', `Bearer ${tokenRecepcionista}`);
    expect(res.status).toBe(403);
  });
});

describe('Evolução do paciente', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 400 sem descrição', async () => {
    pacienteRepository.buscarPorId.mockResolvedValue(pacienteFake);
    const res = await request(app)
      .post('/api/pacientes/1/evolucoes')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('retorna 201 ao registrar evolução', async () => {
    pacienteRepository.buscarPorId.mockResolvedValue(pacienteFake);
    pacienteRepository.criarEvolucao.mockResolvedValue({ id: 1, paciente_id: 1, descricao: 'Paciente relatou dor' });
    const res = await request(app)
      .post('/api/pacientes/1/evolucoes')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ descricao: 'Paciente relatou dor' });
    expect(res.status).toBe(201);
  });

  it('retorna 403 para recepcionista', async () => {
    const res = await request(app)
      .post('/api/pacientes/1/evolucoes')
      .set('Authorization', `Bearer ${tokenRecepcionista}`)
      .send({ descricao: 'teste' });
    expect(res.status).toBe(403);
  });
});
