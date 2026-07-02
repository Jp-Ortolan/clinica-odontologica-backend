// Controller: categoria
// Recebe req/res, valida os dados básicos e delega ao service

const categoriaService = require('../services/categoriaService');

async function listar(req, res, next) {
  try {
    const categorias = await categoriaService.listar();
    res.status(200).json(categorias);
  } catch (err) {
    next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const categoria = await categoriaService.buscarPorId(req.params.id);
    res.status(200).json(categoria);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const categoria = await categoriaService.criar(req.body);
    res.status(201).json(categoria);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const categoria = await categoriaService.atualizar(req.params.id, req.body);
    res.status(200).json(categoria);
  } catch (err) {
    next(err);
  }
}

async function deletar(req, res, next) {
  try {
    const resultado = await categoriaService.deletar(req.params.id);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };
