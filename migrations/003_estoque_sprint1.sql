-- Módulo de estoque: categorias, novos campos de material e validações.

-- 1. Categorias de material
-- Começa com 5 categorias fixas, mas vira tabela própria com CRUD
-- (em vez de um ENUM fixo no banco) porque a equipe pode precisar
-- cadastrar novas categorias no futuro.
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

-- 2. Novos campos do cadastro de material
ALTER TABLE material
    ADD COLUMN IF NOT EXISTS categoria_id    INTEGER REFERENCES categoria(id),
    ADD COLUMN IF NOT EXISTS estoque_ideal   INTEGER,
    ADD COLUMN IF NOT EXISTS fabricante      VARCHAR,
    ADD COLUMN IF NOT EXISTS lote            VARCHAR,
    ADD COLUMN IF NOT EXISTS registro_anvisa VARCHAR,
    ADD COLUMN IF NOT EXISTS data_entrada    DATE,
    ADD COLUMN IF NOT EXISTS validade        DATE;

-- Migra valores antigos da coluna 'categoria' (texto livre) para a nova
-- categoria_id, quando o texto bater com algum nome cadastrado. Fica
-- dentro de um EXECUTE porque a coluna antiga pode já ter sido removida
-- numa execução anterior — sem isso, reaplicar a migration quebraria
-- com "coluna categoria não existe".
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'material' AND column_name = 'categoria'
    ) THEN
        EXECUTE '
            UPDATE material m
            SET categoria_id = c.id
            FROM categoria c
            WHERE m.categoria_id IS NULL
              AND m.categoria IS NOT NULL
              AND lower(m.categoria) = lower(c.nome)
        ';
    END IF;
END $$;

-- A coluna antiga de categoria (texto livre) é substituída por categoria_id.
ALTER TABLE material DROP COLUMN IF EXISTS categoria;

-- 3. Estoque ideal, quando informado, não pode ser menor que o mínimo.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_material_estoque_ideal') THEN
        ALTER TABLE material ADD CONSTRAINT chk_material_estoque_ideal
            CHECK (estoque_ideal IS NULL OR estoque_ideal >= estoque_minimo);
    END IF;
END $$;
