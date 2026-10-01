const pool = require('../config/database');

async function transacao(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

async function lerSaude(client, id) {
  const { rows } = await client.query('SELECT alergias_status, medicamentos_status, saude_versao FROM paciente WHERE id = $1', [id]);
  if (!rows[0]) throw { status: 404, message: 'Paciente não encontrado' };
  const a = await client.query('SELECT * FROM alergia_paciente WHERE paciente_id = $1 ORDER BY id', [id]);
  const m = await client.query('SELECT * FROM medicamento_paciente WHERE paciente_id = $1 ORDER BY id', [id]);
  return { ...rows[0], alergias_status: a.rows.length ? 'informado' : rows[0].alergias_status,
    medicamentos_status: m.rows.length ? 'informado' : rows[0].medicamentos_status,
    alergias: a.rows, medicamentos: m.rows };
}

async function gravarSaude(client, id, dados) {
  await client.query('DELETE FROM alergia_paciente WHERE paciente_id = $1', [id]);
  await client.query('DELETE FROM medicamento_paciente WHERE paciente_id = $1', [id]);
  for (const a of dados.alergias) await client.query('INSERT INTO alergia_paciente (paciente_id, substancia, gravidade) VALUES ($1, $2, $3)', [id, a.substancia.trim(), a.gravidade || null]);
  for (const m of dados.medicamentos) await client.query('INSERT INTO medicamento_paciente (paciente_id, nome_medicamento, dosagem) VALUES ($1, $2, $3)', [id, m.nome_medicamento.trim(), m.dosagem?.trim() || null]);
  await client.query('UPDATE paciente SET alergias_status = $2, medicamentos_status = $3, saude_versao = saude_versao + 1 WHERE id = $1', [id, dados.alergias_status, dados.medicamentos_status]);
}

async function saude(id) {
  return transacao(async client => {
    await client.query('SELECT id FROM paciente WHERE id = $1 FOR SHARE', [id]);
    return lerSaude(client, id);
  });
}

async function atualizarSaude(id, dados, podeRemover = false) {
  return transacao(async client => {
    const { rows } = await client.query('SELECT saude_versao FROM paciente WHERE id = $1 FOR UPDATE', [id]);
    if (!rows[0]) throw { status: 404, message: 'Paciente não encontrado' };
    if (dados.saude_versao !== rows[0].saude_versao) throw { status: 409, message: 'Outro usuário atualizou estas informações. Recarregue antes de editar.' };
    if (!podeRemover) {
      const atual = await lerSaude(client, id);
      for (const [chave, campos] of [['alergias', ['substancia', 'gravidade']], ['medicamentos', ['nome_medicamento', 'dosagem']]]) {
        if (atual[chave].some(item => !dados[chave].some(novo => novo.id === item.id && campos.every(c => (novo[c] || '') === (item[c] || ''))))) {
          throw { status: 403, message: 'Somente professor ou coordenador pode remover ou alterar registros existentes. Você pode acrescentar informações.' };
        }
      }
    }
    await gravarSaude(client, id, dados);
    return lerSaude(client, id);
  });
}

async function criarPaciente(dados) {
  return transacao(async client => {
    const { nome, cpf, data_nascimento, telefone, email, endereco } = dados;
    const { rows } = await client.query('INSERT INTO paciente (nome, cpf, data_nascimento, telefone, email, endereco) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [nome, cpf, data_nascimento, telefone, email, endereco]);
    await gravarSaude(client, rows[0].id, dados.saude);
    return rows[0];
  });
}

async function historico(id) {
  const { rows } = await pool.query(`
    SELECT * FROM (
      SELECT 'consulta-' || c.id AS id, 'consulta' AS tipo, c.data_hora AS criado_em,
        COALESCE(c.queixa_principal, 'Consulta') AS descricao, c.observacoes, c.status,
        c.disciplina, u.nome AS responsavel, c.id AS consulta_id
      FROM consulta c LEFT JOIN usuario u ON u.id = c.usuario_id WHERE c.paciente_id = $1
      UNION ALL
      SELECT 'cirurgia-' || c.id, 'cirurgia', c.data_hora, COALESCE(c.tipo_cirurgia, 'Cirurgia'),
        c.observacoes, c.status, NULL, u.nome, NULL
      FROM cirurgia c LEFT JOIN usuario u ON u.id = c.usuario_id WHERE c.paciente_id = $1
      UNION ALL
      SELECT 'evolucao-' || e.id, 'evolucao', e.criado_em, e.descricao, NULL, 'registrada', NULL, u.nome, e.consulta_id
      FROM evolucao_paciente e LEFT JOIN usuario u ON u.id = e.usuario_id WHERE e.paciente_id = $1
      UNION ALL
      SELECT 'documento-' || d.id, 'documento', d.criado_em, d.nome_arquivo, NULL, 'anexado', NULL, u.nome, NULL
      FROM documento_paciente d LEFT JOIN usuario u ON u.id = d.usuario_id WHERE d.paciente_id = $1
    ) historico ORDER BY criado_em DESC, id DESC`, [id]);
  return rows;
}

module.exports = { saude, atualizarSaude, criarPaciente, historico };
