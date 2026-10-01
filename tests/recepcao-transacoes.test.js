jest.mock('../src/config/database', () => ({ connect: jest.fn(), query: jest.fn() }));
const pool = require('../src/config/database');
const prontuario = require('../src/repositories/prontuarioRepository');
const consultas = require('../src/repositories/consultaRepository');
const equipe = require('../src/services/consultaEquipeService');
let client;
beforeEach(() => {
  jest.clearAllMocks();
  client = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
  pool.connect.mockResolvedValue(client); pool.query.mockResolvedValue({ rows: [] });
});

test('agendamento e notificação são confirmados na mesma transação', async () => {
  client.query.mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{ id: 7 }] });
  await consultas.criar({ paciente_id: 42, usuario_id: 1, data_hora: '2026-10-01T09:00:00', disciplina: 'Endodontia' });
  expect(client.query.mock.calls[0][0]).toBe('BEGIN');
  expect(client.query.mock.calls[2][0]).toContain('INSERT INTO notificacao');
  expect(client.query.mock.calls[2][1][0]).toBe(1);
  expect(client.query.mock.calls[3][0]).toBe('COMMIT');
});

test('falha ao gravar notificação reverte o agendamento', async () => {
  client.query.mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{ id: 7 }] }).mockRejectedValueOnce(new Error('notificação falhou'));
  await expect(consultas.criar({ usuario_id: 1 })).rejects.toThrow('notificação falhou');
  expect(client.query).toHaveBeenCalledWith('ROLLBACK'); expect(client.release).toHaveBeenCalled();
});

test('edição desatualizada da saúde é recusada sem apagar dados', async () => {
  client.query.mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{ saude_versao: 2 }] });
  await expect(prontuario.atualizarSaude(42, { saude_versao: 1 })).rejects.toMatchObject({ status: 409 });
  expect(client.query.mock.calls.some(([sql]) => sql.startsWith('DELETE'))).toBe(false);
});

test('falha ao inserir alergia desfaz cadastro inteiro', async () => {
  client.query.mockImplementation(async sql => {
    if (sql.startsWith('INSERT INTO paciente ')) return { rows: [{ id: 42 }] };
    if (sql.startsWith('INSERT INTO alergia_paciente')) throw new Error('alergia falhou');
    return { rows: [] };
  });
  await expect(prontuario.criarPaciente({ nome: 'Maria', saude: { alergias: [{ substancia: 'Látex' }], medicamentos: [] } })).rejects.toThrow('alergia falhou');
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
});

test('professor de outra consulta não altera a equipe', async () => {
  client.query.mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{ usuario_id: 9, status: 'agendada' }] });
  await expect(equipe.atribuir(7, [2], { id: 1, perfil: 'professor' })).rejects.toMatchObject({ status: 403 });
  expect(client.query.mock.calls.some(([sql]) => sql.startsWith('DELETE'))).toBe(false);
});

test('atribuição persiste alunos e notifica os novos sem trocar o supervisor', async () => {
  client.query.mockImplementation(async sql => {
    if (sql.startsWith('SELECT * FROM consulta')) return { rows: [{ id: 7, usuario_id: 1, status: 'agendada', disciplina: 'Endodontia' }] };
    if (sql.startsWith('SELECT id FROM usuario')) return { rows: [{ id: 2 }] };
    return { rows: [] };
  });
  await equipe.atribuir(7, [2], { id: 1, perfil: 'professor' });
  expect(client.query).toHaveBeenCalledWith('INSERT INTO consulta_aluno (consulta_id, aluno_id) VALUES ($1, $2)', [7, 2]);
  const notificacao = client.query.mock.calls.find(([sql]) => sql.startsWith('INSERT INTO notificacao'));
  expect(notificacao[1][0]).toBe(2);
  expect(client.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE consulta '))).toBe(false);
  expect(client.query).toHaveBeenCalledWith('COMMIT');
});

test('histórico inclui todas as fontes sem filtrar pelo usuário', async () => {
  await prontuario.historico(42);
  const [sql, args] = pool.query.mock.calls[0];
  for (const tabela of ['consulta', 'cirurgia', 'evolucao_paciente', 'documento_paciente']) expect(sql).toContain(`FROM ${tabela}`);
  expect(args).toEqual([42]);
});
