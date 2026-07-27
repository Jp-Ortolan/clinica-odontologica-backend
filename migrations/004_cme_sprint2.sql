-- Expande o módulo de esterilização com dados do ciclo de autoclave
-- e controle biológico / Bowie-Dick.

-- 1. Adiciona colunas de ciclo à tabela esterilizacao existente
--    (IF NOT EXISTS para ser idempotente)
ALTER TABLE esterilizacao
    ADD COLUMN IF NOT EXISTS equipamento      VARCHAR,
    ADD COLUMN IF NOT EXISTS tipo_ciclo       VARCHAR DEFAULT 'vapor'
                             CHECK (tipo_ciclo IN ('vapor', 'calor_seco', 'plasma')),
    ADD COLUMN IF NOT EXISTS temperatura      NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS pressao          NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS duracao_minutos  INTEGER,
    ADD COLUMN IF NOT EXISTS status           VARCHAR DEFAULT 'pendente'
                             CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'falhou'));

-- Atualiza status de registros anteriores que não tinham a coluna
UPDATE esterilizacao SET status = 'concluido'
WHERE status IS NULL AND resultado IN ('aprovado', 'reprovado');

UPDATE esterilizacao SET status = 'pendente'
WHERE status IS NULL;

-- 2. Tabela de controle biológico / indicadores de esterilização
CREATE TABLE IF NOT EXISTS controle_biologico (
    id               SERIAL PRIMARY KEY,
    esterilizacao_id INTEGER NOT NULL REFERENCES esterilizacao(id) ON DELETE CASCADE,
    tipo             VARCHAR NOT NULL
                     CHECK (tipo IN ('bowie_dick', 'biologico', 'quimico')),
    resultado        VARCHAR NOT NULL DEFAULT 'pendente'
                     CHECK (resultado IN ('pendente', 'aprovado', 'reprovado')),
    lote_indicador   VARCHAR,
    data_teste       TIMESTAMP DEFAULT NOW(),
    testado_por_id   INTEGER REFERENCES usuario(id),
    observacao       TEXT,
    criado_em        TIMESTAMP DEFAULT NOW()
);
