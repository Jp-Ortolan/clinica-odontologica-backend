# Integração com os fluxos atuais do frontend

Esta versão inclui perfil de coordenador, recuperação por código de e-mail, prontuário compartilhado, equipe de alunos nas consultas, estoque por lote e rastreabilidade de pacotes CME.

## Banco de dados

As migrations abaixo foram aplicadas e registradas em `_migrations` no PostgreSQL do Railway em 30/09/2026. Foram preservados os registros originais e os campos adicionais do cadastro de pacientes.

- `014_perfil_coordenador.sql`
- `015_recuperacao_codigo.sql`
- `016_recepcao_prontuario.sql`
- `017_lotes_pacotes_alunos.sql`
- `018_compatibilidade_status.sql`

Os arquivos entram no repositório para manter o histórico e permitir a criação/atualização de outros ambientes. O `npm run migrate` roda sozinho no deploy (Dockerfile) e ignora os arquivos já registrados; na primeira execução ele só preenche o checksum das migrations antigas. A única migration nova depois desta integração é a `019_log_auditoria.sql` (tabela de auditoria). Não reaplicar manualmente nem remover registros de `_migrations`. A migration 018 amplia os status de consulta e pacote aceitos pelo banco.

A aplicação do banco foi validada em PostgreSQL local e em uma nova conexão somente leitura no Railway. A integração da API publicada ainda precisa da homologação abaixo. Não executar scripts de teste com dados fictícios contra produção.

## Configuração e compatibilidade

- Preservar `DATABASE_URL`, `JWT_SECRET`, `PORT` e a configuração de produção do serviço.
- Configurar `RESEND_API_KEY` e `EMAIL_FROM` com remetente verificado para habilitar a recuperação de senha. As chaves ficam exclusivamente no backend. Sem configuração, a recuperação responde 503.
- Recuperação: `POST /api/auth/recuperar-senha` recebe `{ email }`; `POST /api/auth/redefinir-senha` recebe `{ email, codigo, nova_senha }`. O contrato anterior por token foi substituído.
- Administração de usuários, logs e permissões passa a exigir `coordenador`. Professores mantêm o acesso clínico. A migration não promove contas automaticamente; o script `scripts/promover-coordenador.js` permite promover uma conta ativa escolhida explicitamente por `COORDENADOR_EMAIL`. Não é executado no deploy.
- Preservar os parsers de DATE/TIMESTAMP em `src/config/database.js` e o limite JSON de 12 MB para documentos enviados em base64.
- Cadastro de paciente recebe `saude` com declarações explícitas de alergias/medicamentos. Edições de saúde utilizam `saude_versao` e retornam 409 em conflito.
- A consulta mantém o supervisor em `usuario_id`, enquanto a equipe fica em `consulta_aluno`. A atribuição de alunos gera notificações.
- Lotes e saldo total são atualizados em transação. Pacotes usam `pacote_item` para múltiplos instrumentos e `pacote_evento` para o histórico.

## Validação antes de liberar o serviço

Executar `npm test` (banco/provedor simulados). Após o deploy, validar com contas de teste os quatro perfis, recuperação por e-mail, cadastro e edição de saúde, documentos, agendamento e equipe, notificações, entrada/saída por lote e preparo/esterilização/liberação/utilização de pacotes. Conferir persistência ao recarregar e acesso em outra conta.

O endpoint `/health` atual verifica o processo HTTP; não confirma por si só a conexão com PostgreSQL nem os contratos da API.
