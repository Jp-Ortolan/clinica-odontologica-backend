// Service: dashboard
// Monta o resumo numérico usado pelas telas de Dashboard (professor/aluno).

const dashboardRepository = require('../repositories/dashboardRepository');

async function obterResumo(perfil) {
  const [
    pacientesAtivos,
    consultasHoje,
    consultasPorStatus,
    cirurgiasHoje,
    materiaisCriticos,
    esterilizacoesPendentes,
  ] = await Promise.all([
    dashboardRepository.contarPacientesAtivos(),
    dashboardRepository.contarConsultasHoje(),
    dashboardRepository.contarConsultasPorStatusHoje(),
    dashboardRepository.contarCirurgiasHoje(),
    dashboardRepository.contarMateriaisEstoqueCritico(),
    dashboardRepository.contarEsterilizacoesPendentes(),
  ]);

  const resumo = {
    pacientes_ativos: pacientesAtivos,
    consultas_hoje: consultasHoje,
    consultas_hoje_por_status: consultasPorStatus,
    cirurgias_hoje: cirurgiasHoje,
  };

  // Estoque e esterilização são operacionais — não fazem sentido para
  // o dashboard do aluno, que acompanha atendimento clínico.
  if (perfil !== 'aluno') {
    resumo.materiais_estoque_critico = materiaisCriticos;
    resumo.esterilizacoes_pendentes = esterilizacoesPendentes;
  }

  return resumo;
}

module.exports = { obterResumo };
