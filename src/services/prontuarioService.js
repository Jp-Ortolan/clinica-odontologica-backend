const repo = require('../repositories/prontuarioRepository');
const pacientes = require('../repositories/pacienteRepository');

function validarSaude(dados) {
  if (!dados || typeof dados !== 'object') throw { status: 400, message: 'Alergias e medicamentos são obrigatórios.' };
  for (const [chave, campo] of [['alergias', 'substancia'], ['medicamentos', 'nome_medicamento']]) {
    const status = dados[`${chave}_status`], itens = dados[chave];
    if (!['informado', 'nenhum'].includes(status) || !Array.isArray(itens) || itens.length > 100 ||
      (status === 'informado' && itens.length === 0) || (status === 'nenhum' && itens.length !== 0) ||
      itens.some(item => !item || typeof item[campo] !== 'string' || !item[campo].trim() || item[campo].length > 500)) {
      throw { status: 400, message: `Informe ${chave}, ou declare que o paciente não possui/não utiliza.` };
    }
  }
  if (dados.alergias.some(a => a.gravidade && !['leve', 'moderada', 'grave'].includes(a.gravidade)) ||
      dados.medicamentos.some(m => m.dosagem != null && (typeof m.dosagem !== 'string' || m.dosagem.length > 500))) {
    throw { status: 400, message: 'Confira a gravidade das alergias e a dosagem dos medicamentos.' };
  }
}

async function atualizarSaude(id, dados, ator) { validarSaude(dados); return repo.atualizarSaude(id, dados, ['professor', 'coordenador'].includes(ator?.perfil)); }
async function historico(id) {
  if (!await pacientes.buscarPorId(id)) throw { status: 404, message: 'Paciente não encontrado' };
  return repo.historico(id);
}
module.exports = { validarSaude, atualizarSaude, historico };
