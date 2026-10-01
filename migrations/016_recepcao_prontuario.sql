ALTER TABLE paciente
  ADD COLUMN IF NOT EXISTS alergias_status VARCHAR CHECK (alergias_status IN ('informado', 'nenhum')),
  ADD COLUMN IF NOT EXISTS medicamentos_status VARCHAR CHECK (medicamentos_status IN ('informado', 'nenhum')),
  ADD COLUMN IF NOT EXISTS saude_versao INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS consulta_aluno (
  consulta_id INTEGER NOT NULL REFERENCES consulta(id) ON DELETE CASCADE,
  aluno_id INTEGER NOT NULL REFERENCES usuario(id),
  PRIMARY KEY (consulta_id, aluno_id)
);
