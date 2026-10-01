-- Aplicar depois das migrations 001 a 017.
-- O executor scripts/migrate.js do backend controla a transacao.
-- Nao remove registros nem altera os status existentes.

ALTER TABLE consulta DROP CONSTRAINT IF EXISTS chk_consulta_status;
ALTER TABLE consulta ADD CONSTRAINT chk_consulta_status
  CHECK (status IN (
    'agendada', 'confirmada', 'aguardando', 'em_atendimento',
    'realizada', 'cancelada', 'faltou'
  ));

ALTER TABLE pacote_esterilizado DROP CONSTRAINT IF EXISTS chk_pacote_status;
ALTER TABLE pacote_esterilizado ADD CONSTRAINT chk_pacote_status
  CHECK (status IN (
    'aguardando', 'em_esterilizacao', 'esterilizado', 'utilizado', 'vencido'
  ));
