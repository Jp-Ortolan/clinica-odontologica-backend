-- Disciplina/especialidade da consulta.
--
-- Esta coluna estava prevista na versão ORIGINAL da migration 002, que foi
-- abandonada por conter "DROP TABLE alergia_paciente/medicamento_paciente"
-- (ver migrations/archive/). Ao reescrever a 002 sem os DROPs, a coluna
-- acabou ficando de fora — e nunca foi recriada.
--
-- O efeito disso na interface: a recepção escolhe a disciplina num campo
-- obrigatório ao agendar, mas como não havia onde guardar, o valor era
-- concatenado dentro de queixa_principal (gerando textos como
-- "Cirurgia — Cirurgia"). E o filtro "Selecione a disciplina" da Agenda do
-- Professor e do Aluno só conseguia oferecer "Todas as disciplinas",
-- porque não existia campo nenhum para agrupar.

ALTER TABLE consulta ADD COLUMN IF NOT EXISTS disciplina VARCHAR(50);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_consulta_disciplina') THEN
        ALTER TABLE consulta ADD CONSTRAINT chk_consulta_disciplina
            CHECK (disciplina IS NULL OR disciplina IN (
                'Dentística', 'Endodontia', 'Periodontia', 'Ortodontia',
                'Odontopediatria', 'Cirurgia Bucal', 'Prótese', 'Reabilitação Bucal'
            ));
    END IF;
END $$;

-- A agenda filtra por disciplina dentro de um intervalo de datas.
CREATE INDEX IF NOT EXISTS idx_consulta_disciplina
    ON consulta (disciplina, data_hora);

-- Cirurgia também é organizada por especialidade nas telas do professor.
ALTER TABLE cirurgia ADD COLUMN IF NOT EXISTS disciplina VARCHAR(50);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cirurgia_disciplina') THEN
        ALTER TABLE cirurgia ADD CONSTRAINT chk_cirurgia_disciplina
            CHECK (disciplina IS NULL OR disciplina IN (
                'Dentística', 'Endodontia', 'Periodontia', 'Ortodontia',
                'Odontopediatria', 'Cirurgia Bucal', 'Prótese', 'Reabilitação Bucal'
            ));
    END IF;
END $$;
