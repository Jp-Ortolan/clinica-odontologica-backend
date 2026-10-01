// Testes: utilitário de transação (BEGIN / COMMIT / ROLLBACK)

const mockClient = { query: jest.fn().mockResolvedValue({}), release: jest.fn() };
jest.mock('../src/config/database', () => ({ connect: jest.fn(() => Promise.resolve(mockClient)) }));

const transacao = require('../src/utils/transacao');

afterEach(() => jest.clearAllMocks());

it('faz COMMIT e devolve o resultado quando tudo dá certo', async () => {
  const resultado = await transacao(async (db) => {
    await db.query('UPDATE x');
    return 42;
  });

  expect(resultado).toBe(42);
  expect(mockClient.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'UPDATE x', 'COMMIT']);
  expect(mockClient.release).toHaveBeenCalled();
});

it('faz ROLLBACK e repassa o erro quando algo falha no meio', async () => {
  await expect(transacao(async (db) => {
    await db.query('INSERT historico');
    throw new Error('falhou o ajuste do saldo');
  })).rejects.toThrow('falhou o ajuste do saldo');

  expect(mockClient.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'INSERT historico', 'ROLLBACK']);
  expect(mockClient.release).toHaveBeenCalled();
});
