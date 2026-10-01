-- Auditoria gravada no banco.
--
-- Antes os eventos de auditoria iam só para logs/audit.log, dentro do
-- container. O Railway recria o container a cada deploy, então o histórico
-- de auditoria sumia junto. Agora cada evento também vira uma linha aqui.
-- Só cria estrutura nova; não mexe em nenhuma tabela existente.

CREATE TABLE IF NOT EXISTS log_auditoria (
    id         BIGSERIAL PRIMARY KEY,
    nivel      VARCHAR(10) NOT NULL CHECK (nivel IN ('info', 'warn', 'error')),
    mensagem   TEXT        NOT NULL,
    dados      JSONB,
    criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_log_auditoria_criado_em
    ON log_auditoria (criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_log_auditoria_nivel
    ON log_auditoria (nivel, criado_em DESC);
