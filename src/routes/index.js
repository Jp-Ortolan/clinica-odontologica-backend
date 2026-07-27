const express = require('express');
const router = express.Router();

router.use('/auth',           require('./authRoutes'));
router.use('/usuarios',       require('./usuarioRoutes'));
router.use('/pacientes',      require('./pacienteRoutes'));
router.use('/consultas',      require('./consultaRoutes'));
router.use('/cirurgias',      require('./cirurgiaRoutes'));
router.use('/materiais',      require('./materialRoutes'));
router.use('/categorias',     require('./categoriaRoutes'));
router.use('/movimentacoes',  require('./movimentacaoRoutes'));
router.use('/esterilizacoes', require('./esterilizacaoRoutes'));
router.use('/logs',           require('./logRoutes'));
router.use('/permissoes',     require('./permissaoRoutes'));
router.use('/dashboard',      require('./dashboardRoutes'));

module.exports = router;
