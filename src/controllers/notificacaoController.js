const notificacaoService = require('../services/notificacaoService');

// Todas as rotas de notificação operam sobre o usuário logado (req.user.id),
// nunca sobre um id vindo da URL — ninguém lê a caixa do outro.

async function listar(req, res, next) {
  try {
    const { naoLidas, limite } = req.query;
    const notificacoes = await notificacaoService.listar(req.user.id, {
      apenasNaoLidas: naoLidas,
      limite,
    });
    res.status(200).json(notificacoes);
  } catch (err) {
    next(err);
  }
}

async function contarNaoLidas(req, res, next) {
  try {
    const resultado = await notificacaoService.contarNaoLidas(req.user.id);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    // Só professor chega aqui (ver notificacaoRoutes). Se o corpo não
    // trouxer destinatário, a notificação é pra quem está criando.
    const nova = await notificacaoService.criar({
      ...req.body,
      usuario_id: req.body.usuario_id || req.user.id,
    });
    res.status(201).json(nova);
  } catch (err) {
    next(err);
  }
}

async function marcarComoLida(req, res, next) {
  try {
    const atualizada = await notificacaoService.marcarComoLida(req.params.id, req.user.id);
    res.status(200).json(atualizada);
  } catch (err) {
    next(err);
  }
}

async function marcarTodasComoLidas(req, res, next) {
  try {
    const resultado = await notificacaoService.marcarTodasComoLidas(req.user.id);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function deletar(req, res, next) {
  try {
    await notificacaoService.deletar(req.params.id, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  contarNaoLidas,
  criar,
  marcarComoLida,
  marcarTodasComoLidas,
  deletar,
};
