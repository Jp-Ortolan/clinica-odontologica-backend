const pacienteService = require('../services/pacienteService');

async function listar(req, res, next) {
  try {
    const filtros = {};
    if (req.query.ativo === 'true') filtros.ativo = true;
    if (req.query.ativo === 'false') filtros.ativo = false;
    const pacientes = await pacienteService.listar(filtros);
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

async function atualizarStatusAtivo(req, res, next) {
  try {
    const paciente = await pacienteService.atualizarStatusAtivo(req.params.id, req.body.ativo);
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

// ── Alergias ─────────────────────────────────────────────────

async function listarAlergias(req, res, next) {
  try {
    res.status(200).json(await pacienteService.listarAlergias(req.params.id));
  } catch (err) { next(err); }
}

async function criarAlergia(req, res, next) {
  try {
    res.status(201).json(await pacienteService.criarAlergia(req.params.id, req.body));
  } catch (err) { next(err); }
}

async function deletarAlergia(req, res, next) {
  try {
    res.status(200).json(await pacienteService.deletarAlergia(req.params.alergiaId));
  } catch (err) { next(err); }
}

// ── Medicamentos ─────────────────────────────────────────────

async function listarMedicamentos(req, res, next) {
  try {
    res.status(200).json(await pacienteService.listarMedicamentos(req.params.id));
  } catch (err) { next(err); }
}

async function criarMedicamento(req, res, next) {
  try {
    res.status(201).json(await pacienteService.criarMedicamento(req.params.id, req.body));
  } catch (err) { next(err); }
}

async function deletarMedicamento(req, res, next) {
  try {
    res.status(200).json(await pacienteService.deletarMedicamento(req.params.medicamentoId));
  } catch (err) { next(err); }
}

// ── Documentos ───────────────────────────────────────────────

async function listarDocumentos(req, res, next) {
  try {
    res.status(200).json(await pacienteService.listarDocumentos(req.params.id));
  } catch (err) { next(err); }
}

async function criarDocumento(req, res, next) {
  try {
    res.status(201).json(await pacienteService.criarDocumento(req.params.id, req.user.id, req.body));
  } catch (err) { next(err); }
}

async function baixarDocumento(req, res, next) {
  try {
    const documento = await pacienteService.baixarDocumento(req.params.documentoId);
    res.set('Content-Type', documento.tipo_arquivo || 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${documento.nome_arquivo}"`);
    res.status(200).send(documento.conteudo);
  } catch (err) { next(err); }
}

async function deletarDocumento(req, res, next) {
  try {
    res.status(200).json(await pacienteService.deletarDocumento(req.params.documentoId));
  } catch (err) { next(err); }
}

// ── Evolução do paciente ─────────────────────────────────────

async function listarEvolucoes(req, res, next) {
  try {
    res.status(200).json(await pacienteService.listarEvolucoes(req.params.id));
  } catch (err) { next(err); }
}

async function criarEvolucao(req, res, next) {
  try {
    res.status(201).json(await pacienteService.criarEvolucao(req.params.id, req.user.id, req.body));
  } catch (err) { next(err); }
}

module.exports = {
  listar, buscarPorId, buscarCep, criar, atualizar, atualizarStatusAtivo, deletar,
  listarAlergias, criarAlergia, deletarAlergia,
  listarMedicamentos, criarMedicamento, deletarMedicamento,
  listarDocumentos, criarDocumento, baixarDocumento, deletarDocumento,
  listarEvolucoes, criarEvolucao,
};
