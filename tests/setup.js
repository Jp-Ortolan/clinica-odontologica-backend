// Configurações globais de teste (Supertest)
// Garante variáveis de ambiente obrigatórias mesmo sem um .env local (ex.: no CI)
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_jwt_clinica';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://test:test@localhost:5432/clinica_odontologica_test';
process.env.PORT = process.env.PORT || 3000;

// Silencia o console.error do errorHandler durante os testes.
// Os services lançam objetos { message, status } (sem stack), então
// err.stack é undefined — o log seria apenas "undefined" e poluiria o output.
jest.spyOn(console, 'error').mockImplementation(() => {});
