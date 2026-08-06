-- Ajustes de modelagem: novas colunas e constraints de validação.

ALTER TABLE paciente
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

-- Postgres não tem "ADD CONSTRAINT IF NOT EXISTS", então cada constraint
-- abaixo confere antes se já existe em pg_constraint — assim a migration
-- pode ser reaplicada sem erro num banco que já tenha essas constraints.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_material_codigo_barras') THEN
        ALTER TABLE material ADD CONSTRAINT uq_material_codigo_barras UNIQUE (codigo_barras);
    END IF;
END $$;

-- O estoque nunca pode ficar negativo.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_material_quantidade_nao_negativa') THEN
        ALTER TABLE material ADD CONSTRAINT chk_material_quantidade_nao_negativa CHECK (quantidade >= 0);
    END IF;
END $$;

-- QR Code do pacote esterilizado deve ser único.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_pacote_esterilizado_qr_code') THEN
        ALTER TABLE pacote_esterilizado ADD CONSTRAINT uq_pacote_esterilizado_qr_code UNIQUE (qr_code);
    END IF;
END $$;

-- Perfis válidos do sistema: apenas estes 3.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_usuario_perfil') THEN
        ALTER TABLE usuario ADD CONSTRAINT chk_usuario_perfil
            CHECK (perfil IN ('professor', 'aluno', 'recepcionista'));
    END IF;
END $$;

-- Status possíveis de uma consulta.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_consulta_status') THEN
        ALTER TABLE consulta ADD CONSTRAINT chk_consulta_status
            CHECK (status IN ('agendada', 'realizada', 'cancelada'));
    END IF;
END $$;

-- Mesmos status, agora para cirurgias.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cirurgia_status') THEN
        ALTER TABLE cirurgia ADD CONSTRAINT chk_cirurgia_status
            CHECK (status IN ('agendada', 'realizada', 'cancelada'));
    END IF;
END $$;

-- Tipo de movimentação de estoque só pode ser entrada ou saída.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_movimentacao_tipo') THEN
        ALTER TABLE movimentacao_estoque ADD CONSTRAINT chk_movimentacao_tipo
            CHECK (tipo IN ('entrada', 'saida'));
    END IF;
END $$;

-- Resultados possíveis do ciclo de esterilização.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_esterilizacao_resultado') THEN
        ALTER TABLE esterilizacao ADD CONSTRAINT chk_esterilizacao_resultado
            CHECK (resultado IN ('pendente', 'aprovado', 'reprovado'));
    END IF;
END $$;

-- Status possíveis do pacote esterilizado.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pacote_status') THEN
        ALTER TABLE pacote_esterilizado ADD CONSTRAINT chk_pacote_status
            CHECK (status IN ('esterilizado', 'utilizado', 'vencido'));
    END IF;
END $$;


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

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_paciente_sexo') THEN
        ALTER TABLE paciente ADD CONSTRAINT chk_paciente_sexo
            CHECK (sexo IS NULL OR sexo IN ('masculino', 'feminino', 'outro'));
    END IF;
END $$;

-- Documentos do paciente: exames, radiografias, formulários.
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

-- Agenda organizada por disciplina/especialidade odontológica.

ALTER TABLE consulta
    ADD COLUMN IF NOT EXISTS disciplina VARCHAR(50);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_consulta_disciplina') THEN
        ALTER TABLE consulta ADD CONSTRAINT chk_consulta_disciplina
            CHECK (disciplina IS NULL OR disciplina IN (
                'Dentística', 'Endodontia', 'Periodontia', 'Ortodontia',
                'Odontopediatria', 'Cirurgia Bucal', 'Prótese', 'Reabilitação Bucal'
            ));
    END IF;
END $$;
