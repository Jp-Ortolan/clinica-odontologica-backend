const pool = require('../src/config/database');
jest.mock('../src/config/database', () => ({ query: jest.fn(), connect: jest.fn() }));
const s = require('../src/services/rastreabilidadeService');
const saude = require('../src/repositories/prontuarioRepository');
const material = require('../src/repositories/materialRepository');
const equipe = require('../src/services/consultaEquipeService');
let client;
beforeEach(() => {
  jest.resetAllMocks();
  client = { query: jest.fn().mockResolvedValue({rows:[]}), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
  pool.query.mockResolvedValue({rows:[]});
});

test.each([0, -1, 1.5, 'abc'])('recusa quantidade inválida %s antes de abrir transação', async quantidade => {
  await expect(s.movimentar(1,{tipo:'saida',quantidade},{id:2})).rejects.toMatchObject({status:400});
  expect(pool.connect).not.toHaveBeenCalled();
});
test('entrada atualiza lote e total na mesma transação, reutilizando lote existente', async () => {
  client.query.mockImplementation(async sql => ({rows:sql.startsWith('SELECT * FROM material WHERE')?[{id:1}]:sql.startsWith('SELECT * FROM material_lote')?[{id:3,validade:'2027-01-01',quantidade:10}]:sql.startsWith('INSERT INTO movimentacao')?[{id:7}]:[]}));
  await expect(s.movimentar(1,{tipo:'entrada',quantidade:5,lote:'ABC',validade:'2027-01-01',data_recebimento:'2026-09-10'},{id:2})).resolves.toEqual({id:7});
  expect(client.query).toHaveBeenCalledWith('UPDATE material_lote SET quantidade=quantidade+$1 WHERE id=$2',[5,3]);
  expect(client.query).toHaveBeenCalledWith('UPDATE material SET quantidade=quantidade+$1 WHERE id=$2',[5,1]);
  expect(client.query.mock.calls.some(([sql])=>sql.startsWith('INSERT INTO material_lote'))).toBe(false);
  expect(client.query).toHaveBeenLastCalledWith('COMMIT');
  expect(client.release).toHaveBeenCalled();
});
test('saída não usa saldo de outro lote e reverte sem alterar total', async () => {
  client.query.mockImplementation(async sql=>({rows:sql.startsWith('SELECT * FROM material WHERE')?[{id:1,quantidade:100}]:sql.startsWith('SELECT * FROM material_lote')?[{id:3,quantidade:2}]:[]}));
  await expect(s.movimentar(1,{tipo:'saida',quantidade:3,lote_id:3},{id:2})).rejects.toMatchObject({status:409});
  expect(client.query.mock.calls.some(([sql])=>sql.startsWith('UPDATE'))).toBe(false);
  expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
});
test('erro na gravação da movimentação reverte os dois saldos', async () => {
  client.query.mockImplementation(async sql=>{
    if(sql.startsWith('INSERT INTO movimentacao')) throw new Error('falha de gravação');
    return {rows:sql.startsWith('SELECT * FROM material WHERE')?[{id:1}]:sql.startsWith('SELECT * FROM material_lote')?[{id:3,quantidade:8}]:[]};
  });
  await expect(s.movimentar(1,{tipo:'saida',quantidade:3,lote_id:3},{id:2})).rejects.toThrow('falha de gravação');
  expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
});
test('edição do catálogo nunca escreve quantidade ou lote, preservando entradas concorrentes', async () => {
  pool.query.mockResolvedValue({rows:[{id:1}]});
  await material.atualizar(1,{nome:'Pinça',tipo_material:'instrumental',passa_cme:true,quantidade:0});
  const [sql,params]=pool.query.mock.calls[0];
  expect(sql).not.toMatch(/quantidade\s*=|lote\s*=/);
  expect(params).toHaveLength(13);
  expect(params.slice(-3)).toEqual(['instrumental',true,1]);
});
test.each(['alergias','medicamentos'])('aluno não remove nem altera registros existentes de %s via API', async chave => {
  const atual={alergias_status:'informado',medicamentos_status:'informado',saude_versao:1,alergias:[{id:4,substancia:'Látex',gravidade:'grave'}],medicamentos:[{id:5,nome_medicamento:'Uso contínuo',dosagem:'1/dia'}]};
  client.query.mockImplementation(async sql=>({rows:sql.startsWith('SELECT * FROM alergia')?atual.alergias:sql.startsWith('SELECT * FROM medicamento')?atual.medicamentos:sql.startsWith('SELECT')?[atual]:[]}));
  await expect(saude.atualizarSaude(42,{...atual,[chave]:[]},false)).rejects.toMatchObject({status:403});
  await expect(saude.atualizarSaude(42,{...atual,[chave]:[{...atual[chave][0],substancia:'Outra',nome_medicamento:'Outro'}]},false)).rejects.toMatchObject({status:403});
  expect(client.query.mock.calls.some(([sql])=>sql.startsWith('DELETE'))).toBe(false);
});
test.each([false,true])('adição preservando saúde existente é aceita (pode remover: %s)', async podeRemover => {
  const atual={alergias_status:'informado',medicamentos_status:'nenhum',saude_versao:1,alergias:[{id:4,substancia:'Látex',gravidade:'grave'}],medicamentos:[]};
  client.query.mockImplementation(async sql=>({rows:sql.startsWith('SELECT * FROM alergia')?atual.alergias:sql.startsWith('SELECT * FROM medicamento')?[]:sql.startsWith('SELECT')?[atual]:[]}));
  await saude.atualizarSaude(42,{...atual,alergias:[...atual.alergias,{substancia:'Penicilina'}]},podeRemover);
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO alergia'),[42,'Penicilina',null]);
  expect(client.query).toHaveBeenLastCalledWith('COMMIT');
});
test('professor pode remover e versão desatualizada é recusada', async () => {
  client.query.mockImplementation(async sql=>({rows:sql.startsWith('SELECT *')?[]:sql.startsWith('SELECT')?[{saude_versao:1}]:[]}));
  await saude.atualizarSaude(42,{saude_versao:1,alergias_status:'nenhum',medicamentos_status:'nenhum',alergias:[],medicamentos:[]},true);
  await expect(saude.atualizarSaude(42,{saude_versao:0},true)).rejects.toMatchObject({status:409});
});
test('aluno não grava observação em cirurgia de outra equipe', async () => {
  client.query.mockImplementation(async sql=>({rows:sql.startsWith('SELECT * FROM cirurgia')?[{id:7,usuario_id:1,paciente_id:42}]:[]}));
  await expect(s.registrarObservacao('cirurgia',7,{descricao:'Atendimento'},{id:2,perfil:'aluno'})).rejects.toMatchObject({status:403});
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('cirurgia_aluno WHERE cirurgia_id=$1 AND usuario_id=$2'),[7,2]);
  expect(client.query.mock.calls.some(([sql])=>sql.startsWith('INSERT'))).toBe(false);
});
test('observação da equipe é gravada no histórico do paciente correto', async () => {
  client.query.mockImplementation(async sql=>({rows:sql.startsWith('SELECT * FROM cirurgia')?[{id:7,usuario_id:1,paciente_id:42}]:sql.startsWith('SELECT 1')?[{ok:1}]:[]}));
  await s.registrarObservacao('cirurgia',7,{descricao:'Limpeza realizada'},{id:2,perfil:'aluno'});
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO evolucao_paciente'),[42,2,7,'Limpeza realizada']);
});
test('notificação traz professor, paciente e horário da consulta atribuída', async () => {
  client.query.mockImplementation(async sql=>({rows:sql.startsWith('SELECT * FROM consulta')?[{id:7,usuario_id:1,paciente_id:42,status:'agendada',data_hora:'2026-10-01T09:30:00'}]:sql.startsWith('SELECT id FROM usuario')?[{id:2}]:sql.startsWith('SELECT nome FROM paciente')?[{nome:'Maria'}]:sql.startsWith('SELECT nome FROM usuario')?[{nome:'Ana'}]:[]}));
  await equipe.atribuir(7,[2],{id:1,perfil:'professor'});
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO notificacao'),[2,'Atendimento atribuído','Professor Ana te escalou para atender o paciente Maria às 09:30, em 01/10/2026.',7,'/app/aluno/agenda?consulta=7']);
});
test('aluno não libera pacote; ciclo com controle obrigatório ausente também não libera', async () => {
  client.query.mockImplementation(async sql=>({rows:sql.startsWith('SELECT * FROM pacote')?[{id:1,status:'em_esterilizacao',esterilizacao_id:2}]:sql.startsWith('SELECT * FROM esterilizacao')?[{id:2,status:'concluido',resultado:'aprovado',controle_biologico:true}]:[]}));
  await expect(s.processarPacote(1,{acao:'liberar',validade:'2027-01-01'},{id:2,perfil:'aluno'})).rejects.toMatchObject({status:403});
  await expect(s.processarPacote(1,{acao:'liberar',validade:'2027-01-01'},{id:1,perfil:'professor'})).rejects.toMatchObject({status:409});
  expect(client.query.mock.calls.some(([sql])=>sql.startsWith('UPDATE'))).toBe(false);
});
test('etiqueta identifica pacote único e materiais reais, e não é emitida antes de liberar', async () => {
  let status='aguardando';
  pool.query.mockImplementation(async sql=>({rows:sql.includes('FROM pacote_esterilizado p')?[{id:125,status,nome_pacote:'Kit',responsavel_esterilizacao:'Ana'}]:sql.includes('FROM pacote_item')?[{material_id:2,nome:'Pinça',quantidade:2}]:[]}));
  await expect(s.etiqueta(125)).rejects.toMatchObject({status:409});
  status='esterilizado';
  const p=await s.etiqueta(125);
  expect(p.codigo).toBe('CME000125');
  expect(p.qr_code).toMatch(/^data:image\/png;base64,/);
  expect(p.itens).toEqual([{material_id:2,nome:'Pinça',quantidade:2}]);
});
test.each(['consulta','cirurgia'])('listagem de %s força identidade do aluno autenticado mesmo com filtro adulterado', async tipo => {
  const controller=require('../src/controllers/'+tipo+'Controller');
  const res={status:jest.fn().mockReturnThis(),json:jest.fn()},next=jest.fn();
  await controller.listar({user:{id:2,perfil:'aluno'},query:{aluno_id:999}},res,next);
  expect(next).not.toHaveBeenCalled();
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining(tipo+'_aluno'),[2]);
  expect(pool.query.mock.calls[0][0]).toContain('= $1');
});
test('preparo de pacote recusa consumível e mantém catálogo intacto', async () => {
  await expect(s.criarPacote({nome:'Kit',itens:[{material_id:1,quantidade:1}]},{id:2})).rejects.toMatchObject({status:400});
  expect(client.query.mock.calls.some(([sql])=>sql.startsWith('INSERT'))).toBe(false);
});
test('liberação aprovada registra responsável, validade e evento atomicamente', async () => {
  client.query.mockImplementation(async sql=>({rows:sql.startsWith('SELECT * FROM pacote')?[{id:1,status:'em_esterilizacao',esterilizacao_id:2}]:sql.startsWith('SELECT * FROM esterilizacao')?[{id:2,status:'concluido',resultado:'aprovado',controle_biologico:true,data_hora:'2026-09-10T09:00:00'}]:sql.startsWith('SELECT tipo,resultado')?[{tipo:'biologico',resultado:'aprovado'}]:[]}));
  pool.query.mockImplementation(async sql=>({rows:sql.includes('FROM pacote_esterilizado p')?[{id:1,status:'esterilizado'}]:[]}));
  await s.processarPacote(1,{acao:'liberar',validade:'2026-10-10'},{id:5,perfil:'professor'});
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('liberado_por=$2'),['2026-10-10',5,1]);
  expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO pacote_evento'),[1,5,'liberar']);
  expect(client.query).toHaveBeenLastCalledWith('COMMIT');
});
