-- Notificações do sistema.
--
-- O protótipo já tinha o sino de notificações nas telas de aluno, professor
-- e recepção, mas não existia nada por trás dele: o botão do aluno navegava
-- pra uma rota inexistente e os outros dois não faziam nada. Esta tabela
-- fecha essa lacuna.
--
-- Cada linha é uma notificação destinada a UM usuário. Quando um evento
-- interessa a um perfil inteiro (ex.: "novo mutirão agendado" para todos os
-- professores), o service grava uma linha por usuário daquele perfil — assim
-- o "lida/não lida" é individual, que é o comportamento esperado.

CREATE TABLE IF NOT EXISTS notificacao (
    id            SERIAL PRIMARY KEY,
    usuario_id    INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    titulo        VARCHAR NOT NULL,
    mensagem      TEXT,

    -- Categoria do evento, usada pelo front pra escolher o ícone/cor:
    -- consulta | cirurgia | estoque | cme | paciente | sistema
    tipo          VARCHAR NOT NULL DEFAULT 'sistema',

    -- Rota do front pra onde o clique na notificação deve levar
    -- (ex.: '/app/recepcao/agenda'). Opcional.
    link          VARCHAR,

    -- Referência solta ao registro que originou a notificação. Não é FK
    -- de propósito: o mesmo campo aponta pra consulta, cirurgia, material
    -- etc. dependendo do "tipo", e o registro pode ser apagado depois.
    referencia_id INTEGER,

    lida          BOOLEAN NOT NULL DEFAULT FALSE,
    lida_em       TIMESTAMP,
    criado_em     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- A consulta mais frequente é "notificações do usuário X, mais novas
-- primeiro", e logo depois "quantas não lidas o usuário X tem".
CREATE INDEX IF NOT EXISTS idx_notificacao_usuario
    ON notificacao (usuario_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_notificacao_nao_lidas
    ON notificacao (usuario_id) WHERE lida = FALSE;
