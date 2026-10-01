// Testes: saída por lote avisa estoque baixo (aviso que existia antes do
// estoque por lote e tinha se perdido na integração).

jest.mock('../src/config/database', () => ({ query: jest.fn(), connect: jest.fn() }));
jest.mock('../src/utils/notificarEventos');
const pool = require('../src/config/database');
const eventos = require('../src/utils/notificarEventos');
const { movimentar } = require('../src/services/rastreabilidadeService');

function clientCom(material) {
  return {
    release: jest.fn(),
    query: jest.fn(async (sql) => ({
      rows: sql.startsWith('SELECT * FROM material WHERE') ? [material]
        : sql.startsWith('SELECT * FROM material_lote') ? [{ id: 3, quantidade: 50, validade: '2027-01-01' }]
        : sql.startsWith('INSERT INTO movimentacao') ? [{ id: 9, lote_id: 3 }]
        : [],
    })),
  };
}

afterEach(() => jest.clearAllMocks());

it('avisa quando a saída faz o material cruzar o estoque mínimo', async () => {
  pool.connect.mockResolvedValue(clientCom({ id: 1, nome: 'Luva', quantidade: 6, estoque_minimo: 5 }));
  await movimentar(1, { tipo: 'saida', quantidade: 2, lote_id: 3 }, { id: 7 });
  expect(eventos.estoqueBaixo).toHaveBeenCalledWith(expect.objectContaining({ id: 1, quantidade: 4 }));
});

it('não avisa de novo se o material já estava abaixo do mínimo', async () => {
  pool.connect.mockResolvedValue(clientCom({ id: 1, nome: 'Luva', quantidade: 4, estoque_minimo: 5 }));
  await movimentar(1, { tipo: 'saida', quantidade: 1, lote_id: 3 }, { id: 7 });
  expect(eventos.estoqueBaixo).not.toHaveBeenCalled();
});

it('não avisa em entrada', async () => {
  pool.connect.mockResolvedValue(clientCom({ id: 1, nome: 'Luva', quantidade: 1, estoque_minimo: 5 }));
  await movimentar(1, { tipo: 'entrada', quantidade: 1, lote: 'A1', validade: '2027-01-01', data_recebimento: '2026-09-30' }, { id: 7 });
  expect(eventos.estoqueBaixo).not.toHaveBeenCalled();
});
