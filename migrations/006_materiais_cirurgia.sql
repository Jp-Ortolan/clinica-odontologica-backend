-- Vincula materiais previstos a uma cirurgia (checklist real, persistido
-- no banco). Antes disso só existia como checklist local no frontend —
-- não sobrevivia a um refresh de página nem era visível a outro usuário.

CREATE TABLE IF NOT EXISTS cirurgia_material (
    id          SERIAL PRIMARY KEY,
    cirurgia_id INTEGER NOT NULL REFERENCES cirurgia(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES material(id),
    quantidade  INTEGER NOT NULL DEFAULT 1,
    criado_em   TIMESTAMP DEFAULT NOW(),
    UNIQUE (cirurgia_id, material_id)
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cirurgia_material_quantidade') THEN
        ALTER TABLE cirurgia_material ADD CONSTRAINT chk_cirurgia_material_quantidade
            CHECK (quantidade >= 0);
    END IF;
END $$;
