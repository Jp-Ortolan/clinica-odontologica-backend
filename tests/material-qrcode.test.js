// Testes: QR-Code e código de barras do material (telas do protótipo
// "Tela QR-Code" e "Tela Código de barras" do módulo de estoque).

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/repositories/materialRepository');
jest.mock('../src/repositories/categoriaRepository');

const materialRepository = require('../src/repositories/materialRepository');
const app = require('../src/app');

function gerarToken(perfil) {
  return jwt.sign(
    { id: 1, nome: 'Usuário Teste', email: 'teste@teste.com', perfil },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const tokenProfessor = gerarToken('professor');
const tokenRecepcionista = gerarToken('recepcionista');

const materialFake = {
  id: 1,
  nome: 'Lidocaina',
  codigo_barras: '7891234567890',
  categoria_id: 1,
  quantidade: 10,
  estoque_minimo: 5,
};

describe('GET /api/materiais/:id/qrcode', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 403 para recepcionista (estoque é só professor/aluno)', async () => {
    const res = await request(app)
      .get('/api/materiais/1/qrcode')
      .set('Authorization', `Bearer ${tokenRecepcionista}`);
    expect(res.status).toBe(403);
  });

  it('retorna 404 quando o material não existe', async () => {
    materialRepository.buscarPorId.mockResolvedValue(null);
    const res = await request(app)
      .get('/api/materiais/999/qrcode')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(404);
  });

  it('retorna 200 com um QR code em data URL', async () => {
    materialRepository.buscarPorId.mockResolvedValue(materialFake);
    const res = await request(app)
      .get('/api/materiais/1/qrcode')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(200);
    expect(res.body.material_id).toBe(1);
    expect(res.body.qr_code).toMatch(/^data:image\/png;base64,/);
  });
});

describe('GET /api/materiais/:id/codigo-barras', () => {
  afterEach(() => jest.clearAllMocks());

  it('retorna 200 com o código de barras do material', async () => {
    materialRepository.buscarPorId.mockResolvedValue(materialFake);
    const res = await request(app)
      .get('/api/materiais/1/codigo-barras')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(200);
    expect(res.body.codigo_barras).toBe('7891234567890');
  });

  it('retorna 404 quando o material não tem código de barras', async () => {
    materialRepository.buscarPorId.mockResolvedValue({ ...materialFake, codigo_barras: null });
    const res = await request(app)
      .get('/api/materiais/1/codigo-barras')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(404);
  });
});
