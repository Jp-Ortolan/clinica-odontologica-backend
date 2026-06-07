// Controller: paciente
// Recebe req/res, valida os dados básicos e delega ao service

const pacienteService = require('../services/pacienteService');

async function listar(req, res, next) {
  try {
    const pacientes = await pacienteService.listar();
    res.status(200).json(pacientes);
  } catch (err) {
    next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const paciente = await pacienteService.buscarPorId(req.params.id);
    res.status(200).json(paciente);
  } catch (err) {
    next(err);
  }
}

async function buscarCep(req, res, next) {
  try {
    const endereco = await pacienteService.buscarEnderecoPorCep(req.params.cep);
    res.status(200).json(endereco);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const paciente = await pacienteService.criar(req.body);
    res.status(201).json(paciente);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const paciente = await pacienteService.atualizar(req.params.id, req.body);
    res.status(200).json(paciente);
  } catch (err) {
    next(err);
  }
}

async function deletar(req, res, next) {
  try {
    const resultado = await pacienteService.deletar(req.params.id);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, buscarPorId, buscarCep, criar, atualizar, deletar };
