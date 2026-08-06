-- A migration 002 original (nunca usada pelo código, já substituída — ver
-- migrations/archive/) continha "DROP TABLE alergia_paciente" e
-- "DROP TABLE medicamento_paciente". Confirmamos em produção que essa
-- versão antiga chegou a rodar antes da correção: as duas tabelas não
-- existem mais no banco, embora src/repositories/pacienteRepository.js
-- ainda dependa delas (listarAlergias/criarAlergia/listarMedicamentos/
-- criarMedicamento). Recria as tabelas com a definição original de
-- 001_create_tables.sql. Como o DROP já tinha acontecido, não há dados
-- antigos pra recuperar — só a estrutura mesmo.

CREATE TABLE IF NOT EXISTS alergia_paciente (
    id          SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
    substancia  VARCHAR NOT NULL,
    gravidade   VARCHAR   -- leve | moderada | grave
);

CREATE TABLE IF NOT EXISTS medicamento_paciente (
    id               SERIAL PRIMARY KEY,
    paciente_id      INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
    nome_medicamento VARCHAR NOT NULL,
    dosagem          VARCHAR
);
