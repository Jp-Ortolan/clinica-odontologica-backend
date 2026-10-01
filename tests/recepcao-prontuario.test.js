const request = require('supertest');
const jwt = require('jsonwebtoken');
jest.mock('../src/repositories/pacienteRepository');
jest.mock('../src/repositories/prontuarioRepository');
jest.mock('../src/repositories/consultaRepository');
jest.mock('../src/repositories/usuarioRepository');
jest.mock('../src/services/consultaEquipeService');
jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));
const pacientes = require('../src/repositories/pacienteRepository');
const prontuario = require('../src/repositories/prontuarioRepository');
const consultas = require('../src/repositories/consultaRepository');
const usuarios = require('../src/repositories/usuarioRepository');
const equipe = require('../src/services/consultaEquipeService');
const app = require('../src/app');
const auth = (perfil, id = 1) => `Bearer ${jwt.sign({ id, perfil }, process.env.JWT_SECRET)}`;
const saude = { alergias_status: 'nenhum', medicamentos_status: 'nenhum', alergias: [], medicamentos: [], saude_versao: 0 };
beforeEach(() => {
  jest.resetAllMocks();
  pacientes.buscarPorId.mockResolvedValue({ id: 42, nome: 'Maria' });
  usuarios.buscarPorId.mockResolvedValue({ id: 1, perfil: 'professor', ativo: true });
  consultas.criar.mockResolvedValue({ id: 7 });
});

test('recepcionistas distintos consultam a mesma listagem sem filtro pelo usuário', async () => {
  pacientes.listar.mockResolvedValue([{ id: 42, nome: 'Maria' }]);
  const a = await request(app).get('/api/pacientes').set('Authorization', auth('recepcionista', 1));
  const b = await request(app).get('/api/pacientes').set('Authorization', auth('recepcionista', 2));
  expect(a.status).toBe(200); expect(b.body).toEqual(a.body);
  expect(pacientes.listar.mock.calls).toEqual([[{}], [{}]]);
});

test.each(['recepcionista', 'aluno', 'professor', 'coordenador'])('%s pode ler histórico e editar saúde compartilhada', async perfil => {
  prontuario.historico.mockResolvedValue([{ id: 'cirurgia-1', descricao: 'Extração' }]);
  prontuario.atualizarSaude.mockResolvedValue({ ...saude, saude_versao: 1 });
  const historico = await request(app).get('/api/pacientes/42/historico').set('Authorization', auth(perfil));
  expect(historico.status).toBe(200); expect(historico.body[0].descricao).toBe('Extração');
  const update = await request(app).put('/api/pacientes/42/saude').set('Authorization', auth(perfil)).send(saude);
  expect(update.status).toBe(200);
  expect(prontuario.atualizarSaude).toHaveBeenCalledWith('42', saude, ['professor', 'coordenador'].includes(perfil));
});

test.each([undefined, {}, { ...saude, alergias_status: 'informado' }, { ...saude, alergias: [{ substancia: 'Látex' }] }])('cadastro rejeita informações de saúde ausentes ou contraditórias: %j', async dadosSaude => {
  pacientes.buscarPorCpf.mockResolvedValue(null);
  const res = await request(app).post('/api/pacientes').set('Authorization', auth('recepcionista')).send({ nome: 'Maria', cpf: '123', data_nascimento: '1990-01-01', saude: dadosSaude });
  expect(res.status).toBe(400); expect(prontuario.criarPaciente).not.toHaveBeenCalled();
});

test('cadastro aceita resposta explícita sem alergias nem medicamentos', async () => {
  prontuario.criarPaciente.mockResolvedValue({ id: 42 });
  const res = await request(app).post('/api/pacientes').set('Authorization', auth('recepcionista')).send({ nome: 'Maria', cpf: '123', data_nascimento: '1990-01-01', saude });
  expect(res.status).toBe(201); expect(prontuario.criarPaciente).toHaveBeenCalled();
});

test.each(['professor', 'coordenador'])('recepção agenda com %s sem aluno', async perfil => {
  usuarios.buscarPorId.mockResolvedValue({ id: 1, perfil, ativo: true });
  const res = await request(app).post('/api/consultas').set('Authorization', auth('recepcionista')).send({ paciente_id: 42, usuario_id: 1, data_hora: '2026-10-01T09:00:00', disciplina: 'Endodontia' });
  expect(res.status).toBe(201); expect(consultas.criar).toHaveBeenCalled();
});

test('recepção não pode escolher aluno como supervisor', async () => {
  usuarios.buscarPorId.mockResolvedValue({ id: 2, perfil: 'aluno', ativo: true });
  const res = await request(app).post('/api/consultas').set('Authorization', auth('recepcionista')).send({ paciente_id: 42, usuario_id: 2, data_hora: '2026-10-01T09:00:00', disciplina: 'Endodontia' });
  expect(res.status).toBe(400); expect(consultas.criar).not.toHaveBeenCalled();
});

test.each(['aluno', 'recepcionista'])('%s não pode atribuir alunos diretamente pela API', async perfil => {
  const res = await request(app).put('/api/consultas/7/alunos').set('Authorization', auth(perfil)).send({ alunos_ids: [2] });
  expect(res.status).toBe(403); expect(equipe.atribuir).not.toHaveBeenCalled();
});

test.each(['professor', 'coordenador', 'aluno'])('%s não pode importar documentos diretamente pela API', async perfil => {
  const res = await request(app).post('/api/pacientes/42/documentos').set('Authorization', auth(perfil)).send({ nome_arquivo: 'exame.pdf', conteudo_base64: 'JVBERg==' });
  expect(res.status).toBe(403); expect(pacientes.criarDocumento).not.toHaveBeenCalled();
});

test('recepção importa documento no paciente correto', async () => {
  pacientes.criarDocumento.mockResolvedValue({ id: 5, nome_arquivo: 'exame.pdf' });
  const res = await request(app).post('/api/pacientes/42/documentos').set('Authorization', auth('recepcionista')).send({ nome_arquivo: 'exame.pdf', tipo_arquivo: 'application/pdf', conteudo_base64: Buffer.from('%PDF-1.4 teste').toString('base64') });
  expect(res.status).toBe(201); expect(pacientes.criarDocumento).toHaveBeenCalledWith('42', 1, expect.objectContaining({ nome_arquivo: 'exame.pdf' }));
});
