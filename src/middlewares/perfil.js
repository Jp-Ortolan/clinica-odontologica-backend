// Libera ou bloqueia uma rota de acordo com o perfil de quem está logado.
// Só funciona depois do middleware de autenticação (auth.js), porque
// precisa do req.user que ele preenche a partir do token.
//
// Perfis do sistema:
// - professor     → acesso total
// - aluno         → consultas e cirurgias sob supervisão, estoque (só visualizar)
// - recepcionista → agendamento e cadastro de pacientes

function autorizar(...perfisPermitidos) {
  return (req, res, next) => {
    const perfilUsuario = req.user?.perfil;

    if (!perfilUsuario) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    if (!perfisPermitidos.includes(perfilUsuario)) {
      return res.status(403).json({
        message: `Acesso negado. Rota permitida apenas para: ${perfisPermitidos.join(', ')}`,
      });
    }

    next();
  };
}

module.exports = autorizar;
