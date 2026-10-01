-- Adiciona um perfil distinto sem promover automaticamente professores existentes.
ALTER TABLE usuario DROP CONSTRAINT IF EXISTS chk_usuario_perfil;
ALTER TABLE usuario ADD CONSTRAINT chk_usuario_perfil
  CHECK (perfil IN ('coordenador', 'professor', 'aluno', 'recepcionista'));
