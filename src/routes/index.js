const express = require('express');
const router = express.Router();

// Prefixo → arquivo de rotas. Exportado também para que a matriz de
// permissões (GET /api/permissoes) seja montada a partir das rotas reais.
const MODULOS = [
  ['/rastreabilidade', require('./rastreabilidadeRoutes')],
  ['/auth',            require('./authRoutes')],
  ['/usuarios',        require('./usuarioRoutes')],
  ['/pacientes',       require('./pacienteRoutes')],
  ['/consultas',       require('./consultaRoutes')],
  ['/cirurgias',       require('./cirurgiaRoutes')],
  ['/materiais',       require('./materialRoutes')],
  ['/categorias',      require('./categoriaRoutes')],
  ['/movimentacoes',   require('./movimentacaoRoutes')],
  ['/esterilizacoes',  require('./esterilizacaoRoutes')],
  ['/notificacoes',    require('./notificacaoRoutes')],
  ['/logs',            require('./logRoutes')],
  ['/permissoes',      require('./permissaoRoutes')],
  ['/dashboard',       require('./dashboardRoutes')],
];

MODULOS.forEach(([prefixo, rotas]) => router.use(prefixo, rotas));

module.exports = router;
module.exports.MODULOS = MODULOS;
