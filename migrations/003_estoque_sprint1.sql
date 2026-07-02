-- ============================================================
-- Migration 003 — Sprint 1: Módulo de Estoque
-- (categorias, novos campos de material e regras de validação)
--
-- Baseado na prototipação das telas:
--   "Controle de Estoque" (resumo por categoria)
--   "Detalhes do material" (campos do cadastro)
-- ============================================================

-- 1. Categorias de material
-- A prototipação mostra um conjunto fixo de 5 categorias usadas
-- nos dashboards de estoque, mas a equipe pode precisar cadastrar
-- novas no futuro — por isso vira tabela própria com CRUD (card
-- "API categorias"), em vez de um ENUM fixo no banco.
CREATE TABLE IF NOT EXISTS categoria (
    id   SERIAL PRIMARY KEY,
    nome VARCHAR NOT NULL UNIQUE
);

INSERT INTO categoria (nome) VALUES
    ('Instrumentais'),
    ('Consumíveis'),
    ('Descartáveis'),
    ('Medicamentos'),
    ('Kits cirúrgicos')
ON CONFLICT (nome) DO NOTHING;

-- 2. Novos campos em material — tela "Detalhes do material"
ALTER TABLE material
    ADD COLUMN IF NOT EXISTS categoria_id    INTEGER REFERENCES categoria(id),
    ADD COLUMN IF NOT EXISTS estoque_ideal   INTEGER,
    ADD COLUMN IF NOT EXISTS fabricante      VARCHAR,
    ADD COLUMN IF NOT EXISTS lote            VARCHAR,
    ADD COLUMN IF NOT EXISTS registro_anvisa VARCHAR,
    ADD COLUMN IF NOT EXISTS data_entrada    DATE,
    ADD COLUMN IF NOT EXISTS validade        DATE;

-- Migra valores antigos da coluna 'categoria' (texto livre) para a nova
-- categoria_id, quando o texto bater com algum nome cadastrado.
UPDATE material m
SET categoria_id = c.id
FROM categoria c
WHERE m.categoria_id IS NULL
  AND m.categoria IS NOT NULL
  AND lower(m.categoria) = lower(c.nome);

-- A coluna antiga de categoria (texto livre) é substituída por categoria_id.
ALTER TABLE material DROP COLUMN IF EXISTS categoria;

-- 3. Regra de negócio: estoque ideal, quando informado, não pode ser
-- menor que o estoque mínimo (não faria sentido na tela de detalhes).
ALTER TABLE material
    ADD CONSTRAINT chk_material_estoque_ideal
    CHECK (estoque_ideal IS NULL OR estoque_ideal >= estoque_minimo);
