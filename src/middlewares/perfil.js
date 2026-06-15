// Middleware: perfil
// Restringe o acesso a rotas com base no perfil do usuário autenticado.
// DEVE ser usado DEPOIS do middleware de autenticação (auth.js),
// pois depende do req.user preenchido pelo JWT.

// Perfis disponíveis no sistema:
// - professor     → acesso total (cadastro de usuários, gestão geral)
// - aluno         → consultas e cirurgias sob supervisão, estoque (visualização)
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
