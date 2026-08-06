-- Vincula materiais previstos a uma CONSULTA, do mesmo jeito que a
-- migration 006 fez para cirurgia.
--
-- A tela "Detalhes do atendimento" (aluno) já mostrava uma lista de
-- materiais previstos com contador de quantidade, mas era uma lista fixa
-- escrita no código do frontend ("Kit Cirúrgico 01", "Seringa Carpule",
-- "Campo Cirúrgico") — não vinha do banco, não persistia e o botão
-- "+ Adicionar materiais" não fazia nada. Esta tabela dá lastro real a
-- essa tela.

CREATE TABLE IF NOT EXISTS consulta_material (
    id          SERIAL PRIMARY KEY,
    consulta_id INTEGER NOT NULL REFERENCES consulta(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES material(id),
    quantidade  INTEGER NOT NULL DEFAULT 1,
    criado_em   TIMESTAMP DEFAULT NOW(),
    UNIQUE (consulta_id, material_id)
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_consulta_material_quantidade') THEN
        ALTER TABLE consulta_material ADD CONSTRAINT chk_consulta_material_quantidade
            CHECK (quantidade >= 0);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_consulta_material_consulta
    ON consulta_material (consulta_id);
