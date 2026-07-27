const categoriaRepository = require('../repositories/categoriaRepository');

async function listar() {
  return categoriaRepository.listar();
}

async function buscarPorId(id) {
  const categoria = await categoriaRepository.buscarPorId(id);
  if (!categoria) throw { status: 404, message: 'Categoria não encontrada' };
  return categoria;
}

async function criar(dados) {
  const { nome } = dados;

  // Regra: nome é obrigatório
  if (!nome || !nome.trim()) {
    throw { status: 400, message: 'Nome da categoria é obrigatório' };
  }

  // Regra: nome não pode ser duplicado (case-insensitive)
  const categoriaExistente = await categoriaRepository.buscarPorNome(nome.trim());
  if (categoriaExistente) {
    throw { status: 409, message: 'Já existe uma categoria cadastrada com esse nome' };
  }

  return categoriaRepository.criar({ nome: nome.trim() });
}

async function atualizar(id, dados) {
  const categoria = await categoriaRepository.buscarPorId(id);
  if (!categoria) throw { status: 404, message: 'Categoria não encontrada' };

  const { nome } = dados;
  if (!nome || !nome.trim()) {
    throw { status: 400, message: 'Nome da categoria é obrigatório' };
  }

  if (nome.trim().toLowerCase() !== categoria.nome.toLowerCase()) {
    const categoriaEmUso = await categoriaRepository.buscarPorNome(nome.trim());
    if (categoriaEmUso) {
      throw { status: 409, message: 'Já existe uma categoria cadastrada com esse nome' };
    }
  }

  return categoriaRepository.atualizar(id, { nome: nome.trim() });
}

async function deletar(id) {
  const categoria = await categoriaRepository.buscarPorId(id);
  if (!categoria) throw { status: 404, message: 'Categoria não encontrada' };

  // Regra: não pode excluir categoria que ainda tem materiais vinculados
  const totalMateriais = await categoriaRepository.contarMateriaisVinculados(id);
  if (totalMateriais > 0) {
    throw {
      status: 409,
      message: `Categoria possui ${totalMateriais} material(is) vinculado(s) e não pode ser excluída`,
    };
  }

  await categoriaRepository.deletar(id);
  return { message: 'Categoria removida com sucesso' };
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };
