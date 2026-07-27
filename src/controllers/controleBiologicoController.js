const controleBiologicoService = require('../services/controleBiologicoService');

async function listarPorCiclo(req, res, next) {
  try {
    const registros = await controleBiologicoService.listarPorCiclo(req.params.id);
    res.status(200).json(registros);
  } catch (err) { next(err); }
}

async function buscarPorId(req, res, next) {
  try {
    const registro = await controleBiologicoService.buscarPorId(req.params.controleId);
    res.status(200).json(registro);
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const registro = await controleBiologicoService.criar(req.params.id, req.body, req.user.id);
    res.status(201).json(registro);
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const registro = await controleBiologicoService.atualizar(req.params.controleId, req.body);
    res.status(200).json(registro);
  } catch (err) { next(err); }
}

async function deletar(req, res, next) {
  try {
    const resultado = await controleBiologicoService.deletar(req.params.controleId);
    res.status(200).json(resultado);
  } catch (err) { next(err); }
}

module.exports = { listarPorCiclo, buscarPorId, criar, atualizar, deletar };
