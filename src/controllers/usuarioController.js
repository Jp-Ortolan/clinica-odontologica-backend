const usuarioService = require('../services/usuarioService');

async function listar(req, res, next) {
  try {
    const filtros = {};
    if (req.query.ativo === 'true') filtros.ativo = true;
    if (req.query.ativo === 'false') filtros.ativo = false;
    if (req.query.perfil) filtros.perfil = req.query.perfil;
    res.status(200).json(await usuarioService.listar(filtros));
  } catch (err) {
    next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    res.status(200).json(await usuarioService.buscarPorId(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    res.status(201).json(await usuarioService.criar(req.body));
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    res.status(200).json(await usuarioService.atualizar(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function deletar(req, res, next) {
  try {
    res.status(200).json(await usuarioService.deletar(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };
