const esterilizacaoService = require('../services/esterilizacaoService');

async function listar(req, res, next) {
  try {
    const ciclos = await esterilizacaoService.listar(req.query);
    res.status(200).json(ciclos);
  } catch (err) { next(err); }
}

async function buscarPorId(req, res, next) {
  try {
    const ciclo = await esterilizacaoService.buscarPorId(req.params.id);
    res.status(200).json(ciclo);
  } catch (err) { next(err); }
}

async function criar(req, res, next) {
  try {
    const ciclo = await esterilizacaoService.criar(req.body, req.user.id);
    res.status(201).json(ciclo);
  } catch (err) { next(err); }
}

async function atualizar(req, res, next) {
  try {
    const ciclo = await esterilizacaoService.atualizar(req.params.id, req.body);
    res.status(200).json(ciclo);
  } catch (err) { next(err); }
}

async function deletar(req, res, next) {
  try {
    const resultado = await esterilizacaoService.deletar(req.params.id);
    res.status(200).json(resultado);
  } catch (err) { next(err); }
}

// ── Pacotes ──────────────────────────────────────────────────

async function listarPacotes(req, res, next) {
  try {
    const pacotes = await esterilizacaoService.listarPacotes(req.params.id);
    res.status(200).json(pacotes);
  } catch (err) { next(err); }
}

async function criarPacote(req, res, next) {
  try {
    const pacote = await esterilizacaoService.criarPacote(req.params.id, req.body);
    res.status(201).json(pacote);
  } catch (err) { next(err); }
}

async function obterQRCode(req, res, next) {
  try {
    const resultado = await esterilizacaoService.obterQRCode(req.params.pacoteId);
    res.status(200).json(resultado);
  } catch (err) { next(err); }
}

async function atualizarStatusPacote(req, res, next) {
  try {
    const pacote = await esterilizacaoService.atualizarStatusPacote(req.params.pacoteId, req.body.status);
    res.status(200).json(pacote);
  } catch (err) { next(err); }
}

module.exports = {
  listar, buscarPorId, criar, atualizar, deletar,
  listarPacotes, criarPacote, obterQRCode, atualizarStatusPacote,
};
