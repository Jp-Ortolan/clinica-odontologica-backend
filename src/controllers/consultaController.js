const consultaService = require('../services/consultaService');

async function listar(req, res, next) {
  try {
    const filtros = {};
    if (req.query.status) filtros.status = req.query.status;
    const consultas = await consultaService.listar(filtros);
    res.status(200).json(consultas);
  } catch (err) {
    next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const consulta = await consultaService.buscarPorId(req.params.id);
    res.status(200).json(consulta);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const consulta = await consultaService.criar(req.body);
    res.status(201).json(consulta);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const consulta = await consultaService.atualizar(req.params.id, req.body);
    res.status(200).json(consulta);
  } catch (err) {
    next(err);
  }
}

async function deletar(req, res, next) {
  try {
    const resultado = await consultaService.deletar(req.params.id);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };
