jest.mock('../src/config/database', () => ({ connect: jest.fn() }));
const pool = require('../src/config/database');
const repo = require('../src/repositories/recoveryRepository');
let client;
beforeEach(() => {
  client = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
});

test.each([
  { reset_token: 'digest', valido: false, reset_attempts: 0 },
  { reset_token: 'digest', valido: true, reset_attempts: 5 },
  { reset_token: null, valido: true, reset_attempts: 0 },
])('não altera senha com código expirado, bloqueado ou já consumido: %j', async row => {
  client.query.mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{ id: 1, ...row }] });
  expect(await repo.consumirCodigo('a@example.com', 'digest', 'hash')).toBe(false);
  expect(client.query.mock.calls.some(([sql]) => sql.includes('SET senha_hash'))).toBe(false);
  expect(client.release).toHaveBeenCalled();
});

test('tentativa incorreta é persistida sob bloqueio de linha', async () => {
  client.query.mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{ id: 1, reset_token: 'digest', valido: true, reset_attempts: 0 }] });
  expect(await repo.consumirCodigo('a@example.com', 'errado', 'hash')).toBe(false);
  expect(client.query.mock.calls[1][0]).toContain('FOR UPDATE');
  expect(client.query.mock.calls[2][0]).toContain('reset_attempts + 1');
  expect(client.query.mock.calls[3][0]).toBe('COMMIT');
});

test('senha e consumo do código são gravados juntos', async () => {
  client.query.mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{ id: 1, reset_token: 'digest', valido: true, reset_attempts: 0 }] });
  expect(await repo.consumirCodigo('a@example.com', 'digest', 'hash')).toBe(true);
  expect(client.query.mock.calls[2][0]).toContain('reset_token = NULL');
  expect(client.query.mock.calls[2][1]).toEqual([1, 'hash']);
  expect(client.query.mock.calls[3][0]).toBe('COMMIT');
});
