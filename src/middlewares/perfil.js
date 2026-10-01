// Libera ou bloqueia uma rota de acordo com o perfil de quem está logado.
// Só funciona depois do middleware de autenticação (auth.js), porque
// precisa do req.user que ele preenche a partir do token.
//
// Perfis do sistema:
// - coordenador   → administração (usuários, logs, permissões) + acesso clínico
// - professor     → acesso clínico completo (sem a administração do sistema)
// - aluno         → consultas e cirurgias sob supervisão, estoque e CME
// - recepcionista → agendamento e cadastro de pacientes
//
// As rotas são a ÚNICA fonte das permissões: a tela "Permissões"
// (GET /api/permissoes) lê a lista `perfis` que este middleware pendura em
// cada rota, em vez de manter uma segunda tabela escrita à mão.

const PERFIS = ['coordenador', 'professor', 'aluno', 'recepcionista'];

function autorizar(...perfisPermitidos) {
  // Cada rota lista explicitamente os perfis aceitos (sem herança implícita).
  const perfis = PERFIS.filter((p) => perfisPermitidos.includes(p));

  const middleware = (req, res, next) => {
    const perfilUsuario = req.user?.perfil;

    if (!perfilUsuario) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    if (!perfis.includes(perfilUsuario)) {
      return res.status(403).json({ message: 'Acesso negado para o seu perfil' });
    }

    next();
  };

  // Lido por src/services/permissaoService.js para montar a matriz.
  middleware.perfis = perfis;
  return middleware;
}

module.exports = autorizar;
module.exports.PERFIS = PERFIS;
