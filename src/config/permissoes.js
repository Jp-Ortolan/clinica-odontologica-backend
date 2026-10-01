// Matriz "o que cada perfil pode fazer", usada pela tela "Permissões".
//
// Antes esta lista era escrita à mão e repetia o que já estava nas rotas —
// e as duas versões tinham divergido. Agora ela é MONTADA a partir das
// próprias rotas: o middleware `autorizar(...)` pendura a lista de perfis
// em cada rota, e aqui só agrupamos por módulo e ação. Mudou a rota, a
// matriz muda junto.

const { PERFIS } = require('../middlewares/perfil');

const ACAO_POR_METODO = { get: 'listar', post: 'criar', put: 'editar', patch: 'editar', delete: 'remover' };

// Rotas sem permissão por perfil (login, recuperação de senha...) ficam fora.
const MODULOS_IGNORADOS = ['auth'];

const DESCRICOES = {
  usuarios: 'Gestão de usuários do sistema',
  'usuarios.profissionais': 'Lista de professores e alunos (sem CPF/e-mail), para agendas',
  pacientes: 'Cadastro e prontuário de pacientes',
  'pacientes.saude': 'Declaração de saúde (alergias e medicamentos)',
  'pacientes.historico': 'Histórico clínico do paciente',
  'pacientes.alergias': 'Alergias do paciente',
  'pacientes.medicamentos': 'Medicamentos em uso pelo paciente',
  'pacientes.documentos': 'Upload/download de documentos do paciente',
  'pacientes.evolucoes': 'Prontuário / evolução clínica',
  consultas: 'Agenda de consultas',
  'consultas.materiais': 'Materiais previstos para a consulta',
  'consultas.alunos': 'Equipe de alunos da consulta',
  cirurgias: 'Agenda de cirurgias',
  'cirurgias.mutiroes': 'Mutirões cirúrgicos',
  'cirurgias.alunos': 'Compartilhamento de cursos (alunos vinculados)',
  'cirurgias.materiais': 'Materiais previstos para a cirurgia',
  materiais: 'Estoque de materiais',
  categorias: 'Categorias de material',
  movimentacoes: 'Entradas/saídas de estoque',
  esterilizacoes: 'Ciclos de esterilização (CME)',
  'esterilizacoes.pacotes': 'Pacotes esterilizados (CME)',
  'esterilizacoes.controles': 'Controles biológicos/químicos (CME)',
  notificacoes: 'Notificações do usuário',
  logs: 'Logs e auditoria do sistema',
  permissoes: 'Matriz de permissões',
  dashboard: 'Dashboard e relatórios',
  rastreabilidade: 'Rastreabilidade (lotes, pacotes CME e observações)',
  'rastreabilidade.materiais': 'Entradas e saídas de estoque por lote',
  'rastreabilidade.pacotes': 'Preparo, esterilização e liberação de pacotes CME',
  'rastreabilidade.consulta': 'Observações clínicas da consulta',
  'rastreabilidade.cirurgia': 'Observações clínicas da cirurgia',
};

// '/pacientes' + '/:id/documentos/:documentoId/download' → 'pacientes.documentos'
// (só os dois primeiros segmentos fixos; ações como /download, /qrcode,
// /status contam como parte do recurso a que pertencem)
function nomeModulo(prefixo, caminho) {
  const segmentos = `${prefixo}${caminho}`.split('/').filter((s) => s && !s.startsWith(':'));
  const [base, sub] = segmentos;
  if (sub && DESCRICOES[`${base}.${sub}`]) return `${base}.${sub}`;
  return base;
}

// Perfis aceitos por uma rota. Vale o `autorizar(...)` da própria rota ou,
// se não houver, o aplicado no arquivo inteiro com router.use(auth, autorizar(...)).
function perfisDaRota(route, padraoDoRouter) {
  const autorizacao = route.stack.find((camada) => Array.isArray(camada.handle.perfis));
  if (autorizacao) return autorizacao.handle.perfis;
  if (padraoDoRouter) return padraoDoRouter;
  const exigeLogin = route.stack.some((camada) => camada.handle.name === 'autenticar');
  return exigeLogin ? PERFIS : null; // só autenticada → todos os perfis
}

function obterMatriz() {
  // require tardio: routes/index.js também carrega este arquivo (via rotas)
  const { MODULOS } = require('../routes');
  const porModulo = new Map();

  MODULOS.forEach(([prefixo, router]) => {
    const padraoDoRouter = router.stack.find((c) => !c.route && Array.isArray(c.handle.perfis))?.handle.perfis;
    router.stack.filter((camada) => camada.route).forEach(({ route }) => {
      const modulo = nomeModulo(prefixo, route.path);
      const perfis = perfisDaRota(route, padraoDoRouter);
      if (!perfis || MODULOS_IGNORADOS.includes(modulo)) return;

      if (!porModulo.has(modulo)) {
        porModulo.set(modulo, { modulo, descricao: DESCRICOES[modulo] || modulo, perfis: {} });
      }
      const entrada = porModulo.get(modulo);
      Object.keys(route.methods).forEach((metodo) => {
        const acao = ACAO_POR_METODO[metodo];
        if (!acao) return;
        // Se várias rotas caem na mesma ação, vale a união dos perfis.
        const atual = new Set(entrada.perfis[acao] || []);
        perfis.forEach((p) => atual.add(p));
        entrada.perfis[acao] = PERFIS.filter((p) => atual.has(p));
      });
    });
  });

  return [...porModulo.values()];
}

function obterPorPerfil(perfil) {
  return obterMatriz()
    .map((m) => ({
      modulo: m.modulo,
      descricao: m.descricao,
      acoes: Object.entries(m.perfis)
        .filter(([, perfis]) => perfis.includes(perfil))
        .map(([acao]) => acao),
    }))
    .filter((m) => m.acoes.length > 0);
}

module.exports = { obterMatriz, obterPorPerfil };
