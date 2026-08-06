-- Recria documento_paciente com o schema que o código usa.
--
-- Mesmo estrago da migration 002 original (a abandonada, ver archive/): além
-- dos DROP TABLE de alergia/medicamento, ela criava documento_paciente com
-- um desenho que nunca foi adotado — tipo/nome/arquivo_url/tamanho, pensado
-- para armazenar o arquivo fora do banco.
--
-- Essa versão antiga chegou a rodar em produção. Como a migration 005 usa
-- "CREATE TABLE IF NOT EXISTS", ela encontrou a tabela já criada (errada) e
-- não fez nada. O resultado é que o upload de documento quebrava com:
--
--     column "usuario_id" of relation "documento_paciente" does not exist
--
-- A tabela está vazia (0 linhas verificadas antes desta migration), então dá
-- para recriar sem perder nada. O desenho abaixo é exatamente o da 005, que
-- é o que pacienteRepository.criarDocumento espera: o arquivo é guardado em
-- BYTEA no próprio Postgres, sem storage externo.

DO $$
BEGIN
    -- Só age se a tabela estiver com o schema antigo, para a migration
    -- continuar sendo segura em bancos que já tenham a versão correta.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documento_paciente' AND column_name = 'arquivo_url'
    ) THEN
        DROP TABLE documento_paciente;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS documento_paciente (
    id             SERIAL PRIMARY KEY,
    paciente_id    INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
    usuario_id     INTEGER NOT NULL REFERENCES usuario(id),
    nome_arquivo   VARCHAR NOT NULL,
    tipo_arquivo   VARCHAR,              -- mime type (application/pdf, image/png...)
    tamanho_bytes  INTEGER,
    conteudo       BYTEA NOT NULL,       -- arquivo armazenado no próprio banco (escopo acadêmico)
    criado_em      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documento_paciente
    ON documento_paciente (paciente_id, criado_em DESC);
