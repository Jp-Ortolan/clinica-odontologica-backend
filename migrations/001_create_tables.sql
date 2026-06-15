-- ============================================================
-- Migration 001 — Criação das tabelas do sistema

-- Ordem de criação respeita as dependências (chaves estrangeiras)
-- ============================================================

-- 1. Usuários do sistema (base para autenticação e relacionamentos)
CREATE TABLE IF NOT EXISTS usuario (
    id            SERIAL PRIMARY KEY,
    nome          VARCHAR NOT NULL,
    cpf           VARCHAR NOT NULL UNIQUE,
    email         VARCHAR NOT NULL UNIQUE,
    senha_hash    VARCHAR NOT NULL,
    telefone      VARCHAR,
    setor         VARCHAR,
    perfil        VARCHAR NOT NULL,   -- professor | aluno | recepcionista
    data_admissao DATE,
    ativo         BOOLEAN DEFAULT TRUE,
    criado_em     TIMESTAMP DEFAULT NOW()
);

-- 2. Pacientes da clínica
CREATE TABLE IF NOT EXISTS paciente (
    id              SERIAL PRIMARY KEY,
    nome            VARCHAR NOT NULL,
    cpf             VARCHAR NOT NULL UNIQUE,
    data_nascimento DATE NOT NULL,
    telefone        VARCHAR,
    email           VARCHAR,
    endereco        VARCHAR,
    criado_em       TIMESTAMP DEFAULT NOW()
);

-- 3. Alergias vinculadas a pacientes
CREATE TABLE IF NOT EXISTS alergia_paciente (
    id          SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
    substancia  VARCHAR NOT NULL,
    gravidade   VARCHAR   -- leve | moderada | grave
);

-- 4. Medicamentos em uso pelos pacientes
CREATE TABLE IF NOT EXISTS medicamento_paciente (
    id               SERIAL PRIMARY KEY,
    paciente_id      INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
    nome_medicamento VARCHAR NOT NULL,
    dosagem          VARCHAR
);

-- 5. Consultas odontológicas
CREATE TABLE IF NOT EXISTS consulta (
    id               SERIAL PRIMARY KEY,
    paciente_id      INTEGER NOT NULL REFERENCES paciente(id),
    usuario_id       INTEGER NOT NULL REFERENCES usuario(id),
    data_hora        TIMESTAMP NOT NULL,
    queixa_principal VARCHAR,
    observacoes      TEXT,
    status           VARCHAR DEFAULT 'agendada'  -- agendada | realizada | cancelada
);

-- 6. Cirurgias odontológicas
CREATE TABLE IF NOT EXISTS cirurgia (
    id            SERIAL PRIMARY KEY,
    paciente_id   INTEGER NOT NULL REFERENCES paciente(id),
    usuario_id    INTEGER NOT NULL REFERENCES usuario(id),
    data_hora     TIMESTAMP NOT NULL,
    tipo_cirurgia VARCHAR,
    status        VARCHAR DEFAULT 'agendada',  -- agendada | realizada | cancelada
    observacoes   TEXT
);

-- 7. Catálogo de materiais do estoque
CREATE TABLE IF NOT EXISTS material (
    id             SERIAL PRIMARY KEY,
    nome           VARCHAR NOT NULL,
    categoria      VARCHAR,
    unidade_medida VARCHAR,
    quantidade     INTEGER NOT NULL DEFAULT 0,
    estoque_minimo INTEGER NOT NULL DEFAULT 5,
    codigo_barras  VARCHAR,
    criado_em      TIMESTAMP DEFAULT NOW()
);

-- 8. Movimentações de estoque (entradas e saídas)
CREATE TABLE IF NOT EXISTS movimentacao_estoque (
    id          SERIAL PRIMARY KEY,
    material_id INTEGER NOT NULL REFERENCES material(id),
    usuario_id  INTEGER NOT NULL REFERENCES usuario(id),
    tipo        VARCHAR NOT NULL,  -- entrada | saida
    quantidade  INTEGER NOT NULL,
    data_hora   TIMESTAMP DEFAULT NOW(),
    observacao  TEXT
);

-- 9. Processos de esterilização
CREATE TABLE IF NOT EXISTS esterilizacao (
    id                 SERIAL PRIMARY KEY,
    usuario_id         INTEGER NOT NULL REFERENCES usuario(id),
    data_hora          TIMESTAMP DEFAULT NOW(),
    resultado          VARCHAR DEFAULT 'pendente',  -- pendente | aprovado | reprovado
    controle_biologico BOOLEAN DEFAULT FALSE,
    observacoes        TEXT
);

-- 10. Pacotes de instrumentos esterilizados
CREATE TABLE IF NOT EXISTS pacote_esterilizado (
    id               SERIAL PRIMARY KEY,
    esterilizacao_id INTEGER NOT NULL REFERENCES esterilizacao(id),
    material_id      INTEGER NOT NULL REFERENCES material(id),
    qr_code          VARCHAR,
    status           VARCHAR DEFAULT 'esterilizado',  -- esterilizado | utilizado | vencido
    validade         DATE,
    criado_em        TIMESTAMP DEFAULT NOW()
);
