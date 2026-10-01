const pool = require('../config/database');
const QRCode = require('qrcode');
const fail = (message, status = 400) => { throw { status, message }; };
const inteiro = n => Number.isSafeInteger(Number(n)) && Number(n) > 0;
const dataValida = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0,10) === d;
async function transacao(fn) {
 const c = await pool.connect();
 try { await c.query('BEGIN'); const r = await fn(c); await c.query('COMMIT'); return r; }
 catch(e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
async function lotes(id) { return (await pool.query('SELECT * FROM material_lote WHERE material_id=$1 ORDER BY validade NULLS LAST,id',[id])).rows; }
async function movimentar(id,d,u) {
 if (!inteiro(d.quantidade) || !['entrada','saida'].includes(d.tipo)) fail('Informe tipo e quantidade inteira positiva.');
 if (d.tipo === 'entrada' && (!d.lote?.trim() || !dataValida(d.validade) || !dataValida(d.data_recebimento))) fail('Lote, validade e data de recebimento são obrigatórios.');
 if (d.tipo === 'entrada' && d.validade < d.data_recebimento) fail('A validade não pode ser anterior ao recebimento.');
 return transacao(async c => {
  const material=(await c.query('SELECT * FROM material WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!material) fail('Material não encontrado.',404);
  let lote;
  if(d.tipo==='entrada') {
   lote=(await c.query('SELECT * FROM material_lote WHERE material_id=$1 AND lote=$2 FOR UPDATE',[id,d.lote.trim()])).rows[0];
   if(lote && String(lote.validade).slice(0,10)!==d.validade) fail('Este lote já está cadastrado com outra validade.',409);
   if(!lote) lote=(await c.query('INSERT INTO material_lote(material_id,lote,validade,data_recebimento,fornecedor,observacao) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[id,d.lote.trim(),d.validade,d.data_recebimento,d.fornecedor||null,d.observacao||null])).rows[0];
  } else {
   lote=(await c.query('SELECT * FROM material_lote WHERE id=$1 AND material_id=$2 FOR UPDATE',[d.lote_id,id])).rows[0];
   if(!lote) fail('Selecione o lote de saída.');
   if(Number(lote.quantidade)<Number(d.quantidade)) fail('Quantidade insuficiente neste lote.',409);
  }
  const delta=d.tipo==='entrada'?Number(d.quantidade):-Number(d.quantidade);
  await c.query('UPDATE material_lote SET quantidade=quantidade+$1 WHERE id=$2',[delta,lote.id]);
  await c.query('UPDATE material SET quantidade=quantidade+$1 WHERE id=$2',[delta,id]);
  return (await c.query('INSERT INTO movimentacao_estoque(material_id,usuario_id,tipo,quantidade,observacao,lote_id,data_recebimento,fornecedor) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[id,u.id,d.tipo,Number(d.quantidade),d.observacao||null,lote.id,d.tipo==='entrada'?d.data_recebimento:null,d.tipo==='entrada'?d.fornecedor||null:null])).rows[0];
 });
}
const pacoteSelect = `SELECT p.*, COALESCE(p.nome,m.nome,'Pacote CME') AS nome_pacote,
 u.nome AS responsavel_preparo, o.nome AS responsavel_esterilizacao, e.equipamento, e.data_hora AS esterilizado_em,
 e.status AS ciclo_status,e.resultado AS ciclo_resultado
 FROM pacote_esterilizado p LEFT JOIN material m ON m.id=p.material_id
 LEFT JOIN usuario u ON u.id=p.preparado_por LEFT JOIN esterilizacao e ON e.id=p.esterilizacao_id LEFT JOIN usuario o ON o.id=e.usuario_id`;
async function pacotes() { return (await pool.query(pacoteSelect+' ORDER BY p.id DESC')).rows; }
async function pacote(id) {
 const p=(await pool.query(pacoteSelect+' WHERE p.id=$1',[id])).rows[0]; if(!p) fail('Pacote não encontrado.',404);
 p.codigo='CME'+String(p.id).padStart(6,'0');
 p.itens=(await pool.query('SELECT i.*,m.nome FROM pacote_item i JOIN material m ON m.id=i.material_id WHERE pacote_id=$1 ORDER BY m.nome',[id])).rows;
 p.historico=(await pool.query('SELECT h.*,u.nome AS responsavel FROM pacote_evento h JOIN usuario u ON u.id=h.usuario_id WHERE pacote_id=$1 ORDER BY h.id DESC',[id])).rows;
 return p;
}
async function criarPacote(d,u) {
 if(!d.nome?.trim() || !Array.isArray(d.itens) || !d.itens.length || d.itens.length>100 || d.itens.some(i=>!inteiro(i.material_id)||!inteiro(i.quantidade)) || new Set(d.itens.map(i=>Number(i.material_id))).size!==d.itens.length) fail('Informe o nome e os instrumentos do pacote, sem duplicatas.');
 const id=await transacao(async c=>{
  const ids=d.itens.map(i=>Number(i.material_id));
  const instrumentos=(await c.query("SELECT id FROM material WHERE id=ANY($1::int[]) AND tipo_material='instrumental' AND passa_cme=true FOR SHARE",[ids])).rows;
  if(instrumentos.length!==ids.length) fail('Selecione somente instrumentais reutilizáveis que passam pelo CME.');
  const p=(await c.query("INSERT INTO pacote_esterilizado(nome,preparado_por,status) VALUES($1,$2,'aguardando') RETURNING id",[d.nome.trim(),u.id])).rows[0];
  for(const i of d.itens) await c.query('INSERT INTO pacote_item VALUES($1,$2,$3)',[p.id,i.material_id,i.quantidade]);
  await c.query("INSERT INTO pacote_evento(pacote_id,usuario_id,evento) VALUES($1,$2,'Pacote preparado')",[p.id,u.id]);
  return p.id;
 }); return pacote(id);
}
async function processarPacote(id,d,u) {
 await transacao(async c=>{
  const p=(await c.query('SELECT * FROM pacote_esterilizado WHERE id=$1 FOR UPDATE',[id])).rows[0]; if(!p) fail('Pacote não encontrado.',404);
  if(d.acao==='iniciar') {
   if(p.status!=='aguardando') fail('O pacote não está aguardando esterilização.',409);
   if(!inteiro(d.ciclo_id)) fail('Selecione o ciclo de esterilização.');
   const ciclo=(await c.query('SELECT * FROM esterilizacao WHERE id=$1 FOR SHARE',[d.ciclo_id])).rows[0];
   if(!ciclo || !['pendente','em_andamento'].includes(ciclo.status)) fail('Selecione um ciclo pendente ou em andamento.');
   await c.query("UPDATE pacote_esterilizado SET esterilizacao_id=$1,status='em_esterilizacao' WHERE id=$2",[d.ciclo_id,id]);
  } else if(d.acao==='liberar') {
   if(!['professor','coordenador'].includes(u.perfil)) fail('Somente professor ou coordenador pode liberar o pacote.',403);
   if(p.status!=='em_esterilizacao' || !dataValida(d.validade)) fail('Confira o status e informe a validade.');
   const ciclo=(await c.query('SELECT * FROM esterilizacao WHERE id=$1 FOR SHARE',[p.esterilizacao_id])).rows[0];
   const controles=(await c.query('SELECT tipo,resultado FROM controle_biologico WHERE esterilizacao_id=$1 FOR SHARE',[p.esterilizacao_id])).rows;
   if(!ciclo || ciclo.status!=='concluido' || ciclo.resultado!=='aprovado' || controles.some(c=>c.resultado!=='aprovado') || (ciclo.controle_biologico && !controles.some(c=>c.tipo==='biologico'&&c.resultado==='aprovado'))) fail('O ciclo precisa estar concluído, aprovado e com os controles exigidos aprovados.',409);
   if(d.validade<String(ciclo.data_hora).slice(0,10)) fail('A validade não pode ser anterior à esterilização.');
   await c.query("UPDATE pacote_esterilizado SET status='esterilizado',validade=$1,liberado_por=$2 WHERE id=$3",[d.validade,u.id,id]);
  } else if(d.acao==='utilizar') {
   if(p.status!=='esterilizado' || !p.validade || String(p.validade).slice(0,10)<new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'})) fail('Somente pacotes liberados e dentro da validade podem ser utilizados.',409);
   await c.query("UPDATE pacote_esterilizado SET status='utilizado' WHERE id=$1",[id]);
  } else fail('Ação inválida.');
  await c.query('INSERT INTO pacote_evento(pacote_id,usuario_id,evento) VALUES($1,$2,$3)',[id,u.id,d.acao]);
 }); return pacote(id);
}
async function etiqueta(id) {
 const p=await pacote(id);
 if(!['esterilizado','utilizado','vencido'].includes(p.status)) fail('A etiqueta final fica disponível após a liberação do pacote.',409);
 return { ...p, qr_code: await QRCode.toDataURL(p.codigo,{errorCorrectionLevel:'M',margin:4,width:320,color:{dark:'#000000',light:'#ffffff'}}) };
}
async function observacoes(tipo,id) { return (await pool.query(`SELECT e.*,u.nome AS responsavel FROM evolucao_paciente e JOIN usuario u ON u.id=e.usuario_id WHERE ${tipo}_id=$1 ORDER BY e.criado_em DESC`,[id])).rows; }
async function registrarObservacao(tipo,id,d,u) {
 if(typeof d.descricao!=='string'||!d.descricao.trim()) fail('Informe a observação do atendimento.');
 return transacao(async c=>{
  const atendimento=(await c.query(`SELECT * FROM ${tipo} WHERE id=$1 FOR SHARE`,[id])).rows[0]; if(!atendimento) fail('Atendimento não encontrado.',404);
  if(u.perfil==='aluno' && String(atendimento.usuario_id)!==String(u.id)) {
   const vinculo=(await c.query(`SELECT 1 FROM ${tipo}_aluno WHERE ${tipo}_id=$1 AND ${tipo==='cirurgia'?'usuario_id':'aluno_id'}=$2`,[id,u.id])).rows;
   if(!vinculo.length) fail('Você não está escalado para este atendimento.',403);
  }
  return (await c.query(`INSERT INTO evolucao_paciente(paciente_id,usuario_id,${tipo}_id,descricao) VALUES($1,$2,$3,$4) RETURNING *`,[atendimento.paciente_id,u.id,id,d.descricao.trim()])).rows[0];
 });
}
module.exports={lotes,movimentar,pacotes,pacote,criarPacote,processarPacote,etiqueta,observacoes,registrarObservacao};
