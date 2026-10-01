ALTER TABLE material ADD COLUMN IF NOT EXISTS tipo_material VARCHAR NOT NULL DEFAULT 'consumivel'
  CHECK (tipo_material IN ('consumivel','instrumental'));
ALTER TABLE material ADD COLUMN IF NOT EXISTS passa_cme BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS material_lote (
 id SERIAL PRIMARY KEY, material_id INTEGER NOT NULL REFERENCES material(id), lote VARCHAR NOT NULL,
 validade DATE, quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
 data_recebimento DATE NOT NULL DEFAULT CURRENT_DATE, fornecedor VARCHAR, observacao TEXT,
 UNIQUE(material_id, lote)
);
INSERT INTO material_lote(material_id,lote,validade,quantidade,data_recebimento)
 SELECT id, COALESCE(NULLIF(lote,''),'LEGADO-' || id), validade, quantidade, COALESCE(data_entrada,CURRENT_DATE)
 FROM material m WHERE quantidade > 0 AND NOT EXISTS (SELECT 1 FROM material_lote l WHERE l.material_id=m.id);
ALTER TABLE movimentacao_estoque ADD COLUMN IF NOT EXISTS lote_id INTEGER REFERENCES material_lote(id);
ALTER TABLE movimentacao_estoque ADD COLUMN IF NOT EXISTS data_recebimento DATE;
ALTER TABLE movimentacao_estoque ADD COLUMN IF NOT EXISTS fornecedor VARCHAR;
ALTER TABLE pacote_esterilizado ALTER COLUMN esterilizacao_id DROP NOT NULL;
ALTER TABLE pacote_esterilizado ALTER COLUMN material_id DROP NOT NULL;
ALTER TABLE pacote_esterilizado ADD COLUMN IF NOT EXISTS nome VARCHAR;
ALTER TABLE pacote_esterilizado ADD COLUMN IF NOT EXISTS preparado_por INTEGER REFERENCES usuario(id);
ALTER TABLE pacote_esterilizado ADD COLUMN IF NOT EXISTS liberado_por INTEGER REFERENCES usuario(id);
CREATE TABLE IF NOT EXISTS pacote_item (
 pacote_id INTEGER NOT NULL REFERENCES pacote_esterilizado(id) ON DELETE CASCADE,
 material_id INTEGER NOT NULL REFERENCES material(id), quantidade INTEGER NOT NULL CHECK (quantidade > 0),
 PRIMARY KEY(pacote_id,material_id)
);
INSERT INTO pacote_item(pacote_id,material_id,quantidade)
 SELECT id, material_id, 1 FROM pacote_esterilizado WHERE material_id IS NOT NULL ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS pacote_evento (
 id SERIAL PRIMARY KEY, pacote_id INTEGER NOT NULL REFERENCES pacote_esterilizado(id),
 usuario_id INTEGER NOT NULL REFERENCES usuario(id), evento VARCHAR NOT NULL, criado_em TIMESTAMP DEFAULT NOW()
);
ALTER TABLE evolucao_paciente ADD COLUMN IF NOT EXISTS cirurgia_id INTEGER REFERENCES cirurgia(id);
