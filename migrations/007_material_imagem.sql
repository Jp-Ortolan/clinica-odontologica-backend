-- Foto do material cadastrado no estoque. Guardada como base64 direto no
-- Postgres (mesmo padrão já usado em documento_paciente.conteudo) — sem
-- serviço de storage externo, o que é suficiente pro escopo acadêmico.
-- Campo opcional: telas antigas e materiais já cadastrados continuam
-- funcionando normalmente sem foto (ficam com ícone genérico no front).

ALTER TABLE material
    ADD COLUMN IF NOT EXISTS imagem_base64 TEXT;
