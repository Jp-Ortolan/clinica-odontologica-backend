const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');
const auth = require('../middlewares/auth');
const autorizar = require('../middlewares/perfil');

// GET /api/categorias → professor e aluno (precisam ver categorias ao cadastrar/filtrar materiais)
router.get('/', auth, autorizar('professor', 'aluno'), categoriaController.listar);

// GET /api/categorias/:id → professor e aluno
router.get('/:id', auth, autorizar('professor', 'aluno'), categoriaController.buscarPorId);

// POST /api/categorias → apenas professor (gestão das categorias do estoque)
router.post('/', auth, autorizar('professor'), categoriaController.criar);

// PUT /api/categorias/:id → apenas professor
router.put('/:id', auth, autorizar('professor'), categoriaController.atualizar);

// DELETE /api/categorias/:id → apenas professor
router.delete('/:id', auth, autorizar('professor'), categoriaController.deletar);

module.exports = router;
