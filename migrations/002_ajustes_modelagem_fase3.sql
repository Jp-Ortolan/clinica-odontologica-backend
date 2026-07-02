-- Migration 002 — Ajustes de modelagem (revisão Fase 3)

ALTER TABLE paciente
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

ALTER TABLE material
    ADD CONSTRAINT uq_material_codigo_barras UNIQUE (codigo_barras);

-- RN-EST-02: estoque nunca pode ficar negativo.
ALTER TABLE material
    ADD CONSTRAINT chk_material_quantidade_nao_negativa CHECK (quantidade >= 0);

-- QR Code do pacote esterilizado deve ser único.
ALTER TABLE pacote_esterilizado
    ADD CONSTRAINT uq_pacote_esterilizado_qr_code UNIQUE (qr_code);

-- RN-USR-04: perfis válidos do sistema.
-- Definição alinhada com a equipe de UX/UI e com a prototipação: apenas 3 perfis.
ALTER TABLE usuario
    ADD CONSTRAINT chk_usuario_perfil
    CHECK (perfil IN ('professor', 'aluno', 'recepcionista'));

--  fluxo de status de consulta.
ALTER TABLE consulta
    ADD CONSTRAINT chk_consulta_status
    CHECK (status IN ('agendada', 'realizada', 'cancelada'));

--  mesmo fluxo para cirurgias.
ALTER TABLE cirurgia
    ADD CONSTRAINT chk_cirurgia_status
    CHECK (status IN ('agendada', 'realizada', 'cancelada'));

-- Tipo de movimentação de estoque só pode ser entrada ou saída.
ALTER TABLE movimentacao_estoque
    ADD CONSTRAINT chk_movimentacao_tipo
    CHECK (tipo IN ('entrada', 'saida'));

--  resultado do ciclo de esterilização.
ALTER TABLE esterilizacao
    ADD CONSTRAINT chk_esterilizacao_resultado
    CHECK (resultado IN ('pendente', 'aprovado', 'reprovado'));

--  fluxo de status do pacote esterilizado.
ALTER TABLE pacote_esterilizado
    ADD CONSTRAINT chk_pacote_status
    CHECK (status IN ('esterilizado', 'utilizado', 'vencido'));


ALTER TABLE paciente
    ADD COLUMN IF NOT EXISTS sexo               VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cep                 VARCHAR(9),
    ADD COLUMN IF NOT EXISTS numero              VARCHAR(10),
    ADD COLUMN IF NOT EXISTS complemento         VARCHAR(100),
    ADD COLUMN IF NOT EXISTS bairro              VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cidade              VARCHAR(100),
    ADD COLUMN IF NOT EXISTS uf                  VARCHAR(2),
    ADD COLUMN IF NOT EXISTS responsavel_nome    VARCHAR(150),
    ADD COLUMN IF NOT EXISTS responsavel_telefone VARCHAR(15),
    ADD COLUMN IF NOT EXISTS responsavel_parentesco VARCHAR(50);

ALTER TABLE paciente
    ADD CONSTRAINT chk_paciente_sexo
    CHECK (sexo IS NULL OR sexo IN ('masculino', 'feminino', 'outro'));

-- Nova entidade: documentos do paciente (exames, radiografias, formulários)
-- Tela "Documentos do paciente" na prototipação.
CREATE TABLE IF NOT EXISTS documento_paciente (
    id          SERIAL        PRIMARY KEY,
    paciente_id INT           NOT NULL,
    tipo        VARCHAR(50)   NOT NULL,
    nome        VARCHAR(200)  NOT NULL,
    arquivo_url VARCHAR(255)  NOT NULL,
    tamanho     INT,
    criado_em   TIMESTAMP     DEFAULT NOW(),
    FOREIGN KEY (paciente_id) REFERENCES paciente(id) ON DELETE CASCADE
);


DROP TABLE IF EXISTS alergia_paciente;
DROP TABLE IF EXISTS medicamento_paciente;

--  agenda organizada por
-- disciplina/especialidade odontológica.
-- ============================================================

ALTER TABLE consulta
    ADD COLUMN IF NOT EXISTS disciplina VARCHAR(50);

ALTER TABLE consulta
    ADD CONSTRAINT chk_consulta_disciplina
    CHECK (disciplina IS NULL OR disciplina IN (
        'Dentística', 'Endodontia', 'Periodontia', 'Ortodontia',
        'Odontopediatria', 'Cirurgia Bucal', 'Prótese', 'Reabilitação Bucal'
    ));
