// Controller: material
// Recebe req/res, valida os dados básicos e delega ao service

const materialService = require('../services/materialService');

async function listar(req, res, next) {
  try {
    const { categoria_id, busca } = req.query;
    const materiais = await materialService.listar({ categoria_id, busca });
    res.status(200).json(materiais);
  } catch (err) {
    next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const material = await materialService.buscarPorId(req.params.id);
    res.status(200).json(material);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const material = await materialService.criar(req.body);
    res.status(201).json(material);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const material = await materialService.atualizar(req.params.id, req.body);
    res.status(200).json(material);
  } catch (err) {
    next(err);
  }
}

async function deletar(req, res, next) {
  try {
    const resultado = await materialService.deletar(req.params.id);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function obterQRCode(req, res, next) {
  try {
    res.status(200).json(await materialService.obterQRCode(req.params.id));
  } catch (err) { next(err); }
}

async function obterCodigoBarras(req, res, next) {
  try {
    res.status(200).json(await materialService.obterCodigoBarras(req.params.id));
  } catch (err) { next(err); }
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar, obterQRCode, obterCodigoBarras };
