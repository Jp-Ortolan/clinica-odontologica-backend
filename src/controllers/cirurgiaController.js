const cirurgiaService = require('../services/cirurgiaService');

async function listar(req, res, next) {
  try {
    const filtros = {};
    if (req.query.status) filtros.status = req.query.status;
    if (req.query.mutirao_id) filtros.mutirao_id = req.query.mutirao_id;
    const cirurgias = await cirurgiaService.listar(filtros);
    res.status(200).json(cirurgias);
  } catch (err) {
    next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const cirurgia = await cirurgiaService.buscarPorId(req.params.id);
    res.status(200).json(cirurgia);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const cirurgia = await cirurgiaService.criar(req.body);
    res.status(201).json(cirurgia);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const cirurgia = await cirurgiaService.atualizar(req.params.id, req.body);
    res.status(200).json(cirurgia);
  } catch (err) {
    next(err);
  }
}

async function deletar(req, res, next) {
  try {
    const resultado = await cirurgiaService.deletar(req.params.id);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

// ── Mutirão cirúrgico ────────────────────────────────────────

async function listarMutiroes(req, res, next) {
  try { res.status(200).json(await cirurgiaService.listarMutiroes()); }
  catch (err) { next(err); }
}

async function buscarMutiraoPorId(req, res, next) {
  try { res.status(200).json(await cirurgiaService.buscarMutiraoPorId(req.params.mutiraoId)); }
  catch (err) { next(err); }
}

async function criarMutirao(req, res, next) {
  try { res.status(201).json(await cirurgiaService.criarMutirao(req.body, req.user.id)); }
  catch (err) { next(err); }
}

async function atualizarMutirao(req, res, next) {
  try { res.status(200).json(await cirurgiaService.atualizarMutirao(req.params.mutiraoId, req.body)); }
  catch (err) { next(err); }
}

async function deletarMutirao(req, res, next) {
  try { res.status(200).json(await cirurgiaService.deletarMutirao(req.params.mutiraoId)); }
  catch (err) { next(err); }
}

async function listarCirurgiasDoMutirao(req, res, next) {
  try { res.status(200).json(await cirurgiaService.listarCirurgiasDoMutirao(req.params.mutiraoId)); }
  catch (err) { next(err); }
}

// ── Compartilhamento de cursos ───────────────────────────────

async function listarAlunosDaCirurgia(req, res, next) {
  try { res.status(200).json(await cirurgiaService.listarAlunosDaCirurgia(req.params.id)); }
  catch (err) { next(err); }
}

async function vincularAluno(req, res, next) {
  try { res.status(201).json(await cirurgiaService.vincularAluno(req.params.id, req.body)); }
  catch (err) { next(err); }
}

async function desvincularAluno(req, res, next) {
  try { res.status(200).json(await cirurgiaService.desvincularAluno(req.params.vinculoId)); }
  catch (err) { next(err); }
}

module.exports = {
  listar, buscarPorId, criar, atualizar, deletar,
  listarMutiroes, buscarMutiraoPorId, criarMutirao, atualizarMutirao, deletarMutirao, listarCirurgiasDoMutirao,
  listarAlunosDaCirurgia, vincularAluno, desvincularAluno,
};
