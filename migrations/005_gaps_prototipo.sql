-- ============================================================
-- Migration 005 — Cobertura de telas do protótipo (Figma)
-- Adiciona o que faltava no banco para os fluxos já desenhados
-- pelo time de UX/UI: status ativo/inativo do paciente, documentos,
-- evolução clínica, mutirão cirúrgico, compartilhamento de cursos,
-- e suporte a recuperação de senha.
-- ============================================================

-- 1. Paciente ativo/inativo (telas "Pacientes Ativos" / "Pacientes Inativos")
ALTER TABLE paciente
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Documentos do paciente (upload/download — tabela citada no README
--    desde a Fase 2 mas nunca criada)
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

-- 3. Evolução do paciente (prontuário / anotações clínicas ao longo do tempo)
CREATE TABLE IF NOT EXISTS evolucao_paciente (
    id           SERIAL PRIMARY KEY,
    paciente_id  INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
    usuario_id   INTEGER NOT NULL REFERENCES usuario(id),
    consulta_id  INTEGER REFERENCES consulta(id),   -- opcional: evolução vinculada a uma consulta
    descricao    TEXT NOT NULL,
    criado_em    TIMESTAMP DEFAULT NOW()
);

-- 4. Mutirão cirúrgico (evento que agrupa várias cirurgias)
CREATE TABLE IF NOT EXISTS mutirao_cirurgico (
    id            SERIAL PRIMARY KEY,
    nome          VARCHAR NOT NULL,
    data_evento   DATE NOT NULL,
    local         VARCHAR,
    usuario_id    INTEGER NOT NULL REFERENCES usuario(id),  -- responsável pelo mutirão
    observacoes   TEXT,
    criado_em     TIMESTAMP DEFAULT NOW()
);

ALTER TABLE cirurgia
    ADD COLUMN IF NOT EXISTS mutirao_id INTEGER REFERENCES mutirao_cirurgico(id);

-- 5. Compartilhamento de cursos — vincula uma cirurgia a múltiplos alunos
--    (crédito/supervisão compartilhada entre turmas/cursos)
CREATE TABLE IF NOT EXISTS cirurgia_aluno (
    id           SERIAL PRIMARY KEY,
    cirurgia_id  INTEGER NOT NULL REFERENCES cirurgia(id) ON DELETE CASCADE,
    usuario_id   INTEGER NOT NULL REFERENCES usuario(id),  -- aluno vinculado
    curso        VARCHAR,                                  -- curso/turma pelo qual o aluno recebe crédito
    papel        VARCHAR DEFAULT 'observador'
                 CHECK (papel IN ('executante', 'auxiliar', 'observador')),
    criado_em    TIMESTAMP DEFAULT NOW(),
    UNIQUE (cirurgia_id, usuario_id)
);

-- 6. Recuperação de senha
ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS reset_token         VARCHAR,
    ADD COLUMN IF NOT EXISTS reset_token_expires  TIMESTAMP;
