// Matriz de permissões — reflete o que já está codificado nos middlewares
// `autorizar(...)` de cada arquivo de rotas.
//
// IMPORTANTE (decisão de arquitetura, não pendência): o controle de acesso
// em si continua sendo aplicado pelo middleware `perfil.js` em cada rota —
// é rápido, testável e não depende do banco estar no ar para bloquear uma
// requisição. Migrar isso para permissões 100% dinâmicas em tabela exigiria
// reescrever esse middleware e re-testar as 169 chamadas de rota já
// cobertas por teste, o que é arriscado perto do prazo. Este módulo serve
// para dar à tela "Permissões" do protótipo uma fonte única e centralizada
// para *consultar* o que cada perfil pode fazer, sem duplicar informação
// desatualizável espalhada pelos arquivos de rota.
//
// Se no futuro quiser permissões editáveis pelo admin, o próximo passo é
// criar uma tabela `permissao` e trocar `perfis` abaixo por uma consulta
// a ela — a rota GET /api/permissoes não muda de formato.

const MATRIZ = [
  { modulo: 'usuarios', descricao: 'Gestão de usuários do sistema', perfis: { listar: ['professor', 'recepcionista'], criar: ['professor'], editar: ['professor'], remover: ['professor'] } },
  { modulo: 'pacientes', descricao: 'Cadastro e prontuário de pacientes', perfis: { listar: ['professor', 'aluno', 'recepcionista'], criar: ['professor', 'recepcionista'], editar: ['professor', 'recepcionista'], remover: ['professor'] } },
  { modulo: 'pacientes.documentos', descricao: 'Upload/download de documentos do paciente', perfis: { listar: ['professor', 'aluno', 'recepcionista'], criar: ['professor', 'recepcionista'], remover: ['professor'] } },
  { modulo: 'pacientes.evolucao', descricao: 'Prontuário / evolução clínica', perfis: { listar: ['professor', 'aluno'], criar: ['professor', 'aluno'] } },
  { modulo: 'consultas', descricao: 'Agenda de consultas', perfis: { listar: ['professor', 'aluno', 'recepcionista'], criar: ['professor', 'aluno'], editar: ['professor', 'aluno'], remover: ['professor'] } },
  { modulo: 'cirurgias', descricao: 'Agenda de cirurgias', perfis: { listar: ['professor', 'aluno', 'recepcionista'], criar: ['professor', 'aluno'], editar: ['professor', 'aluno'], remover: ['professor'] } },
  { modulo: 'cirurgias.mutiroes', descricao: 'Mutirões cirúrgicos', perfis: { listar: ['professor', 'aluno', 'recepcionista'], criar: ['professor'], editar: ['professor'], remover: ['professor'] } },
  { modulo: 'cirurgias.alunos', descricao: 'Compartilhamento de cursos (alunos vinculados)', perfis: { listar: ['professor', 'aluno', 'recepcionista'], criar: ['professor'], remover: ['professor'] } },
  { modulo: 'materiais', descricao: 'Estoque de materiais', perfis: { listar: ['professor', 'aluno'], criar: ['professor', 'aluno'], editar: ['professor', 'aluno'], remover: ['professor'] } },
  { modulo: 'categorias', descricao: 'Categorias de material', perfis: { listar: ['professor', 'aluno'], criar: ['professor'], editar: ['professor'], remover: ['professor'] } },
  { modulo: 'movimentacoes', descricao: 'Entradas/saídas de estoque', perfis: { listar: ['professor', 'aluno'], criar: ['professor', 'aluno'], remover: ['professor'] } },
  { modulo: 'esterilizacoes', descricao: 'Ciclos de esterilização (CME)', perfis: { listar: ['professor', 'aluno'], criar: ['professor', 'aluno'], editar: ['professor', 'aluno'], remover: ['professor'] } },
  { modulo: 'logs', descricao: 'Logs e auditoria do sistema', perfis: { listar: ['professor'] } },
];

function obterMatriz() {
  return MATRIZ;
}

function obterPorPerfil(perfil) {
  return MATRIZ.map((m) => ({
    modulo: m.modulo,
    descricao: m.descricao,
    acoes: Object.entries(m.perfis)
      .filter(([, perfis]) => perfis.includes(perfil))
      .map(([acao]) => acao),
  })).filter((m) => m.acoes.length > 0);
}

module.exports = { obterMatriz, obterPorPerfil };
