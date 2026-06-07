const axios = require('axios');

async function buscarEnderecoPorCep(cep) {
  const { data } = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
  if (data.erro) throw new Error('CEP não encontrado');
  return data;
}

module.exports = { buscarEnderecoPorCep };
