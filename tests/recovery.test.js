jest.mock('../src/repositories/authRepository');
jest.mock('../src/repositories/recoveryRepository');
jest.mock('../src/services/recoveryEmailService');
jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hash') }));
const service = require('../src/services/authService');
const auth = require('../src/repositories/authRepository');
const repo = require('../src/repositories/recoveryRepository');
const mail = require('../src/services/recoveryEmailService');

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret';
  auth.findByEmail.mockResolvedValue({ id: 1, email: 'a@example.com' });
  repo.reservarCodigo.mockResolvedValue(true);
  mail.enviarCodigo.mockResolvedValue();
});

test('envia seis dígitos, armazena digest e não retorna código', async () => {
  const result = await service.solicitarRecuperacaoSenha('a@example.com');
  const codigo = mail.enviarCodigo.mock.calls[0][1];
  expect(codigo).toMatch(/^\d{6}$/);
  expect(repo.reservarCodigo.mock.calls[0][1]).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(result)).not.toContain(codigo);
  expect(result.reset_token).toBeUndefined();
});

test('e-mail inexistente recebe a mesma resposta', async () => {
  const existente = await service.solicitarRecuperacaoSenha('a@example.com');
  mail.enviarCodigo.mockClear();
  auth.findByEmail.mockResolvedValue(null);
  expect(await service.solicitarRecuperacaoSenha('x@example.com')).toEqual(existente);
  expect(mail.enviarCodigo).not.toHaveBeenCalled();
});

test('respeita intervalo de reenvio', async () => {
  repo.reservarCodigo.mockResolvedValue(false);
  await service.solicitarRecuperacaoSenha('a@example.com');
  expect(mail.enviarCodigo).not.toHaveBeenCalled();
});

test('falha de envio invalida apenas o código daquela solicitação', async () => {
  mail.enviarCodigo.mockRejectedValue({ status: 503 });
  await expect(service.solicitarRecuperacaoSenha('a@example.com')).rejects.toMatchObject({ status: 503 });
  expect(repo.invalidarCodigo).toHaveBeenCalledWith(...repo.reservarCodigo.mock.calls[0]);
});

test('confirmação usa o mesmo digest e consome o código', async () => {
  await service.solicitarRecuperacaoSenha('a@example.com');
  repo.consumirCodigo.mockResolvedValue(true);
  await service.redefinirSenha('a@example.com', mail.enviarCodigo.mock.calls[0][1], 'novaSenha123');
  expect(repo.consumirCodigo).toHaveBeenCalledWith('a@example.com', repo.reservarCodigo.mock.calls[0][1], 'hash');
});

test('rejeita código expirado, consumido ou bloqueado', async () => {
  repo.consumirCodigo.mockResolvedValue(false);
  await expect(service.redefinirSenha('a@example.com', '123456', 'novaSenha123')).rejects.toMatchObject({ status: 400 });
});
