jest.mock('axios', () => ({ post: jest.fn() }));
const axios = require('axios');
const mail = require('../src/services/recoveryEmailService');

beforeEach(() => {
  jest.clearAllMocks();
  process.env.RESEND_API_KEY = 'test-key';
  process.env.EMAIL_FROM = 'Clinica <acesso@example.com>';
  process.env.JWT_SECRET = 'test-secret';
});

test('envia código por API com timeout e remetente configurado', async () => {
  axios.post.mockResolvedValue({ data: { id: 'email-id' } });
  await mail.enviarCodigo('a@example.com', '012345');
  expect(axios.post).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
    to: ['a@example.com'], text: expect.stringContaining('012345'), from: process.env.EMAIL_FROM,
  }), expect.objectContaining({ timeout: 15000 }));
});

test('configuração ausente não faz chamada ao provedor', async () => {
  delete process.env.RESEND_API_KEY;
  await expect(mail.enviarCodigo('a@example.com', '012345')).rejects.toMatchObject({ status: 503 });
  expect(axios.post).not.toHaveBeenCalled();
});

test('erro do provedor não expõe chave nem payload', async () => {
  axios.post.mockRejectedValue(new Error('secret-key 012345'));
  await expect(mail.enviarCodigo('a@example.com', '012345')).rejects.toEqual({
    status: 503, message: 'Não foi possível enviar o código. Tente novamente em alguns minutos.',
  });
});
