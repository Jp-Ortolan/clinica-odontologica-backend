-- A tela "Novo material" (aluno e professor) sempre teve um campo
-- "Descrição", mas ele não existia na tabela: o texto era digitado,
-- guardado no estado do React e descartado no envio. Esta migration cria
-- a coluna para que o campo passe a valer alguma coisa.

ALTER TABLE material ADD COLUMN IF NOT EXISTS descricao TEXT;
