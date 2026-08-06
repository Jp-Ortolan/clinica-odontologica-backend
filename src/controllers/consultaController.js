const consultaService = require('../services/consultaService');

async function listar(req, res, next) {
  try {
    const filtros = {};
    if (req.query.status) filtros.status = req.query.status;
    if (req.query.disciplina) filtros.disciplina = req.query.disciplina;
    const consultas = await consultaService.listar(filtros);
    res.status(200).json(consultas);
  } catch (err) {
    next(err);
  }
}

// GET /api/consultas/disciplinas → lista fixa da clínica-escola.
// Existe para o front não precisar repetir os nomes (foi assim que os
// tipos de ciclo do CME acabaram divergindo do backend).
async function listarDisciplinas(req, res, next) {
  try {
    res.status(200).json(consultaService.listarDisciplinas());
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

// ── Materiais previstos da consulta ─────────────────────────────────────

async function listarMateriais(req, res, next) {
  try {
    const materiais = await consultaService.listarMateriaisDaConsulta(req.params.id);
    res.status(200).json(materiais);
  } catch (err) {
    next(err);
  }
}

async function adicionarMaterial(req, res, next) {
  try {
    const vinculo = await consultaService.adicionarMaterial(req.params.id, req.body);
    res.status(201).json(vinculo);
  } catch (err) {
    next(err);
  }
}

async function atualizarQuantidadeMaterial(req, res, next) {
  try {
    const vinculo = await consultaService.atualizarQuantidadeMaterial(
      req.params.id,
      req.params.materialVinculoId,
      req.body.quantidade
    );
    res.status(200).json(vinculo);
  } catch (err) {
    next(err);
  }
}

async function removerMaterial(req, res, next) {
  try {
    const resultado = await consultaService.removerMaterial(
      req.params.id,
      req.params.materialVinculoId
    );
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar, buscarPorId, criar, atualizar, deletar, listarDisciplinas,
  listarMateriais, adicionarMaterial, atualizarQuantidadeMaterial, removerMaterial,
};
