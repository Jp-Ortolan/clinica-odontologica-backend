// Lista, em um lugar só, o que cada perfil pode fazer em cada módulo — é a
// mesma coisa que já está escrita nas rotas (via `autorizar(...)`), só que
// aqui dá pra consultar tudo de uma vez, sem abrir arquivo por arquivo.
//
// Quem realmente bloqueia o acesso continua sendo o middleware `perfil.js`
// em cada rota. Deixamos assim de propósito: é rápido e não depende do
// banco estar no ar pra recusar uma requisição. Se um dia quiser deixar as
// permissões editáveis por um admin, o caminho é criar uma tabela
// `permissao` e trocar a lista `MATRIZ` abaixo por uma consulta a ela — o
// endpoint GET /api/permissoes continua funcionando do mesmo jeito.

const MATRIZ = [
  { modulo: 'usuarios', descricao: 'Gestão de usuários do sistema', perfis: { listar: ['coordenador'], criar: ['coordenador'], editar: ['coordenador'], remover: ['coordenador'] } },
  { modulo: 'pacientes', descricao: 'Cadastro e prontuário de pacientes', perfis: { listar: ['coordenador', 'professor', 'aluno', 'recepcionista'], criar: ['coordenador', 'professor', 'recepcionista'], editar: ['coordenador', 'professor', 'recepcionista'], remover: ['coordenador', 'professor'] } },
  { modulo: 'pacientes.documentos', descricao: 'Upload/download de documentos do paciente', perfis: { listar: ['coordenador', 'professor', 'aluno', 'recepcionista'], criar: ['coordenador', 'professor', 'recepcionista'], remover: ['coordenador', 'professor'] } },
  { modulo: 'pacientes.evolucao', descricao: 'Prontuário / evolução clínica', perfis: { listar: ['coordenador', 'professor', 'aluno'], criar: ['coordenador', 'professor', 'aluno'] } },
  { modulo: 'consultas', descricao: 'Agenda de consultas', perfis: { listar: ['coordenador', 'professor', 'aluno', 'recepcionista'], criar: ['coordenador', 'professor', 'aluno', 'recepcionista'], editar: ['coordenador', 'professor', 'aluno', 'recepcionista'], remover: ['coordenador', 'professor'] } },
  { modulo: 'cirurgias', descricao: 'Agenda de cirurgias', perfis: { listar: ['coordenador', 'professor', 'aluno', 'recepcionista'], criar: ['coordenador', 'professor', 'aluno'], editar: ['coordenador', 'professor', 'aluno'], remover: ['coordenador', 'professor'] } },
  { modulo: 'cirurgias.mutiroes', descricao: 'Mutirões cirúrgicos', perfis: { listar: ['coordenador', 'professor', 'aluno', 'recepcionista'], criar: ['coordenador', 'professor'], editar: ['coordenador', 'professor'], remover: ['coordenador', 'professor'] } },
  { modulo: 'cirurgias.alunos', descricao: 'Compartilhamento de cursos (alunos vinculados)', perfis: { listar: ['coordenador', 'professor', 'aluno', 'recepcionista'], criar: ['coordenador', 'professor'], remover: ['coordenador', 'professor'] } },
  { modulo: 'materiais', descricao: 'Estoque de materiais', perfis: { listar: ['coordenador', 'professor', 'aluno'], criar: ['coordenador', 'professor', 'aluno'], editar: ['coordenador', 'professor', 'aluno'], remover: ['coordenador', 'professor'] } },
  { modulo: 'categorias', descricao: 'Categorias de material', perfis: { listar: ['coordenador', 'professor', 'aluno'], criar: ['coordenador', 'professor'], editar: ['coordenador', 'professor'], remover: ['coordenador', 'professor'] } },
  { modulo: 'movimentacoes', descricao: 'Entradas/saídas de estoque', perfis: { listar: ['coordenador', 'professor', 'aluno'], criar: ['coordenador', 'professor', 'aluno'], remover: ['coordenador', 'professor'] } },
  { modulo: 'esterilizacoes', descricao: 'Ciclos de esterilização (CME)', perfis: { listar: ['coordenador', 'professor', 'aluno'], criar: ['coordenador', 'professor', 'aluno'], editar: ['coordenador', 'professor', 'aluno'], remover: ['coordenador', 'professor'] } },
  { modulo: 'notificacoes', descricao: 'Notificações do usuário', perfis: { listar: ['coordenador', 'professor', 'aluno', 'recepcionista'], criar: ['coordenador', 'professor'], editar: ['coordenador', 'professor', 'aluno', 'recepcionista'], remover: ['coordenador', 'professor', 'aluno', 'recepcionista'] } },
  { modulo: 'logs', descricao: 'Logs e auditoria do sistema', perfis: { listar: ['coordenador'] } },
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
