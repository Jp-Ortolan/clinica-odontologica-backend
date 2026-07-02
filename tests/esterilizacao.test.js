// Testes: módulo CME — ciclos de esterilização, pacotes e controle biológico
// Card "Testes CME" e "Fluxos esterilização" do cronograma.

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/repositories/esterilizacaoRepository');
jest.mock('../src/repositories/controleBiologicoRepository');
jest.mock('../src/utils/qrcode');

const esterilizacaoRepository   = require('../src/repositories/esterilizacaoRepository');
const controleBiologicoRepository = require('../src/repositories/controleBiologicoRepository');
const { gerarQRCode }            = require('../src/utils/qrcode');
const app = require('../src/app');

function gerarToken(perfil) {
  return jwt.sign(
    { id: 1, nome: 'Usuário Teste', email: 'teste@teste.com', perfil },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const tokenProfessor    = gerarToken('professor');
const tokenAluno        = gerarToken('aluno');
const tokenRecepcionista = gerarToken('recepcionista');

const cicloFake = {
  id: 1,
  usuario_id: 1,
  equipamento: 'Autoclave A',
  tipo_ciclo: 'vapor',
  temperatura: 134.0,
  pressao: 2.1,
  duracao_minutos: 18,
  resultado: 'pendente',
  controle_biologico: false,
  status: 'pendente',
  observacoes: null,
  operador_nome: 'Professor',
};

const pacoteFake = {
  id: 1,
  esterilizacao_id: 1,
  material_id: 1,
  qr_code: 'data:image/png;base64,QRFAKE',
  status: 'esterilizado',
  validade: '2026-12-31',
  material_nome: 'Pinça',
};

const controleFake = {
  id: 1,
  esterilizacao_id: 1,
  tipo: 'bowie_dick',
  resultado: 'pendente',
  lote_indicador: 'L001',
  testado_por_id: 1,
  testado_por_nome: 'Professor',
  observacao: null,
};

afterEach(() => jest.clearAllMocks());

// ── CICLOS ────────────────────────────────────────────────────

describe('GET /api/esterilizacoes', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/esterilizacoes');
    expect(res.status).toBe(401);
  });

  it('retorna 403 para recepcionista', async () => {
    const res = await request(app)
      .get('/api/esterilizacoes')
      .set('Authorization', `Bearer ${tokenRecepcionista}`);
    expect(res.status).toBe(403);
  });

  it('retorna 200 e lista de ciclos', async () => {
    esterilizacaoRepository.listar.mockResolvedValue([cicloFake]);
    const res = await request(app)
      .get('/api/esterilizacoes')
      .set('Authorization', `Bearer ${tokenAluno}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].equipamento).toBe('Autoclave A');
  });
});

describe('POST /api/esterilizacoes', () => {
  it('retorna 400 quando equipamento está ausente', async () => {
    const res = await request(app)
      .post('/api/esterilizacoes')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ tipo_ciclo: 'vapor' });
    expect(res.status).toBe(400);
    expect(esterilizacaoRepository.criar).not.toHaveBeenCalled();
  });

  it('retorna 400 para tipo_ciclo inválido', async () => {
    const res = await request(app)
      .post('/api/esterilizacoes')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ equipamento: 'Autoclave A', tipo_ciclo: 'microondas' });
    expect(res.status).toBe(400);
  });

  it('retorna 201 ao criar ciclo com dados válidos', async () => {
    esterilizacaoRepository.criar.mockResolvedValue(cicloFake);
    const res = await request(app)
      .post('/api/esterilizacoes')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ equipamento: 'Autoclave A', tipo_ciclo: 'vapor', temperatura: 134, duracao_minutos: 18 });
    expect(res.status).toBe(201);
    expect(res.body.equipamento).toBe('Autoclave A');
  });
});

describe('PUT /api/esterilizacoes/:id', () => {
  it('retorna 404 quando ciclo não existe', async () => {
    esterilizacaoRepository.buscarPorId.mockResolvedValue(null);
    const res = await request(app)
      .put('/api/esterilizacoes/999')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ status: 'concluido' });
    expect(res.status).toBe(404);
  });

  it('retorna 400 para status inválido', async () => {
    esterilizacaoRepository.buscarPorId.mockResolvedValue(cicloFake);
    const res = await request(app)
      .put('/api/esterilizacoes/1')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ status: 'cancelado' });
    expect(res.status).toBe(400);
  });

  it('retorna 200 ao atualizar para status concluido', async () => {
    esterilizacaoRepository.buscarPorId.mockResolvedValue(cicloFake);
    esterilizacaoRepository.atualizar.mockResolvedValue({ ...cicloFake, status: 'concluido', resultado: 'aprovado' });
    const res = await request(app)
      .put('/api/esterilizacoes/1')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ status: 'concluido', resultado: 'aprovado' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('concluido');
  });
});

describe('DELETE /api/esterilizacoes/:id', () => {
  it('retorna 403 para aluno', async () => {
    const res = await request(app)
      .delete('/api/esterilizacoes/1')
      .set('Authorization', `Bearer ${tokenAluno}`);
    expect(res.status).toBe(403);
  });

  it('retorna 404 quando ciclo não existe', async () => {
    esterilizacaoRepository.buscarPorId.mockResolvedValue(null);
    const res = await request(app)
      .delete('/api/esterilizacoes/999')
      .set('Authorization', `Bearer ${tokenProfessor}`);
    expect(res.status).toBe(404);
  });
});

// ── PACOTES ───────────────────────────────────────────────────

describe('POST /api/esterilizacoes/:id/pacotes (QR Code gerado automaticamente)', () => {
  it('retorna 400 quando material_id está ausente', async () => {
    esterilizacaoRepository.buscarPorId.mockResolvedValue(cicloFake);
    const res = await request(app)
      .post('/api/esterilizacoes/1/pacotes')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ validade: '2026-12-31' });
    expect(res.status).toBe(400);
    expect(esterilizacaoRepository.criarPacote).not.toHaveBeenCalled();
  });

  it('retorna 201 com QR code gerado e vinculado ao pacote', async () => {
    esterilizacaoRepository.buscarPorId.mockResolvedValue(cicloFake);
    gerarQRCode.mockResolvedValue('data:image/png;base64,QRFAKE');
    esterilizacaoRepository.criarPacote.mockResolvedValue(pacoteFake);

    const res = await request(app)
      .post('/api/esterilizacoes/1/pacotes')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ material_id: 1, validade: '2026-12-31' });

    expect(res.status).toBe(201);
    expect(gerarQRCode).toHaveBeenCalled(); // QR foi gerado
    expect(res.body.qr_code).toBeTruthy();
  });
});

describe('GET /api/esterilizacoes/pacotes/:pacoteId/qrcode', () => {
  it('retorna 404 quando pacote não existe', async () => {
    esterilizacaoRepository.buscarPacotePorId.mockResolvedValue(null);
    const res = await request(app)
      .get('/api/esterilizacoes/pacotes/999/qrcode')
      .set('Authorization', `Bearer ${tokenAluno}`);
    expect(res.status).toBe(404);
  });

  it('retorna 200 com qr_code quando pacote existe', async () => {
    esterilizacaoRepository.buscarPacotePorId.mockResolvedValue(pacoteFake);
    const res = await request(app)
      .get('/api/esterilizacoes/pacotes/1/qrcode')
      .set('Authorization', `Bearer ${tokenAluno}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('qr_code');
  });
});

// ── CONTROLE BIOLÓGICO ────────────────────────────────────────

describe('POST /api/esterilizacoes/:id/controles', () => {
  it('retorna 404 quando o ciclo não existe', async () => {
    esterilizacaoRepository.buscarPorId.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/esterilizacoes/999/controles')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ tipo: 'bowie_dick' });
    expect(res.status).toBe(404);
  });

  it("retorna 400 para tipo inválido", async () => {
    esterilizacaoRepository.buscarPorId.mockResolvedValue(cicloFake);
    const res = await request(app)
      .post('/api/esterilizacoes/1/controles')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ tipo: 'visual' });
    expect(res.status).toBe(400);
  });

  it('retorna 201 ao registrar controle Bowie-Dick', async () => {
    esterilizacaoRepository.buscarPorId.mockResolvedValue(cicloFake);
    controleBiologicoRepository.criar.mockResolvedValue(controleFake);

    const res = await request(app)
      .post('/api/esterilizacoes/1/controles')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ tipo: 'bowie_dick', lote_indicador: 'L001' });

    expect(res.status).toBe(201);
    expect(res.body.tipo).toBe('bowie_dick');
  });
});

describe('PUT /api/esterilizacoes/:id/controles/:controleId', () => {
  it('retorna 404 quando controle não existe', async () => {
    controleBiologicoRepository.buscarPorId.mockResolvedValue(null);
    const res = await request(app)
      .put('/api/esterilizacoes/1/controles/999')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ resultado: 'aprovado' });
    expect(res.status).toBe(404);
  });

  it('retorna 200 ao registrar resultado aprovado', async () => {
    controleBiologicoRepository.buscarPorId.mockResolvedValue(controleFake);
    controleBiologicoRepository.atualizar.mockResolvedValue({ ...controleFake, resultado: 'aprovado' });

    const res = await request(app)
      .put('/api/esterilizacoes/1/controles/1')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ resultado: 'aprovado' });

    expect(res.status).toBe(200);
    expect(res.body.resultado).toBe('aprovado');
  });
});

// ── FLUXO COMPLETO ────────────────────────────────────────────

describe('Fluxo esterilização completo', () => {
  it('cria ciclo → adiciona pacote com QR → registra controle → finaliza ciclo', async () => {
    // 1. cria ciclo
    esterilizacaoRepository.criar.mockResolvedValue(cicloFake);
    const resCiclo = await request(app)
      .post('/api/esterilizacoes')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ equipamento: 'Autoclave A', tipo_ciclo: 'vapor' });
    expect(resCiclo.status).toBe(201);

    // 2. adiciona pacote (QR gerado)
    esterilizacaoRepository.buscarPorId.mockResolvedValue(cicloFake);
    gerarQRCode.mockResolvedValue('data:image/png;base64,QRFAKE');
    esterilizacaoRepository.criarPacote.mockResolvedValue(pacoteFake);
    const resPacote = await request(app)
      .post('/api/esterilizacoes/1/pacotes')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ material_id: 1, validade: '2026-12-31' });
    expect(resPacote.status).toBe(201);
    expect(gerarQRCode).toHaveBeenCalledTimes(1);

    // 3. registra controle Bowie-Dick
    controleBiologicoRepository.criar.mockResolvedValue(controleFake);
    const resControle = await request(app)
      .post('/api/esterilizacoes/1/controles')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ tipo: 'bowie_dick', lote_indicador: 'L001' });
    expect(resControle.status).toBe(201);

    // 4. finaliza ciclo como aprovado
    esterilizacaoRepository.atualizar.mockResolvedValue({ ...cicloFake, status: 'concluido', resultado: 'aprovado' });
    const resFim = await request(app)
      .put('/api/esterilizacoes/1')
      .set('Authorization', `Bearer ${tokenProfessor}`)
      .send({ status: 'concluido', resultado: 'aprovado' });
    expect(resFim.status).toBe(200);
    expect(resFim.body.resultado).toBe('aprovado');
  });
});
