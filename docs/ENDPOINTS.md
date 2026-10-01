# Documentação da API

Referência das rotas do backend da Clínica Odontológica.

**Base:** `https://clinica-odontologica-backend-production.up.railway.app/api`

## Como autenticar

Todas as rotas abaixo, exceto as de login e recuperação de senha, exigem um
token JWT no cabeçalho `Authorization`.

```bash
# 1. Login — devolve { token, usuario }
curl -X POST https://clinica-odontologica-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"professor@clinica.com","senha":"SUA_SENHA"}'

# 2. Usar o token nas demais chamadas
curl https://clinica-odontologica-backend-production.up.railway.app/api/pacientes \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## Perfis e controle de acesso

O sistema tem quatro perfis, e cada rota declara quais deles podem acessá-la
(middleware `perfil.js`). Uma chamada com perfil não autorizado recebe
`403 Acesso negado`.

| Perfil | Escopo |
|---|---|
| `coordenador` | Administração (usuários, logs, permissões) + todo o acesso clínico do professor |
| `professor` | Acesso clínico completo: supervisão, exclusões clínicas, liberação de pacotes CME |
| `aluno` | Atendimento clínico, estoque e CME |
| `recepcionista` | Agendamento, cadastro de pacientes e documentos |

Regras que valem a pena destacar:

- **Estoque e CME** são fechados para a recepção — ela não repõe material nem
  opera a autoclave.
- **Prontuário** (evolução clínica) é restrito a professor e aluno. A
  recepção pode registrar alergias e medicamentos em uso, que o paciente
  informa no balcão.
- **Pacientes não são excluídos** (guarda obrigatória do prontuário): use
  `PATCH /api/pacientes/:id/status` para inativar.
- **Histórico de estoque é imutável**: movimentação não é editada nem
  apagada; corrija com uma movimentação inversa.
- Onde a coluna "Quem pode" cita `professor`, o `coordenador` também pode.
- **Administração** (usuários, logs, permissões, `/metrics`) é só do coordenador.
- A tabela sempre atualizada é `GET /api/permissoes`, montada a partir
  das próprias rotas.
- **Exclusões** (`DELETE`) são quase todas exclusivas de professor/coordenador.
- **Notificações** são individuais: cada usuário só lê e altera as suas.

## Códigos de resposta

| Código | Significado |
|---|---|
| `200` / `201` | Sucesso |
| `400` | Dados inválidos (campo obrigatório, valor fora da lista aceita) |
| `401` | Token ausente, inválido ou expirado |
| `403` | Perfil sem permissão para a rota |
| `404` | Registro não encontrado |
| `405` | Operação bloqueada por regra (ex.: editar/apagar movimentação) |
| `409` | Conflito (CPF duplicado, estoque insuficiente, registro vinculado a outros dados) |
| `413` | Arquivo ou corpo da requisição grande demais (limite 12 MB) |
| `429` | Muitas tentativas de login/recuperação; aguarde alguns minutos |
| `500` | Erro interno (detalhes ficam só no log do servidor) |

## Endpoints

### Autenticação  ·  `/api/auth`

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| `POST` | `/api/auth/login` | **público** | Autentica e devolve o token JWT + dados do usuário |
| `POST` | `/api/auth/recuperar-senha` | **público** | `{ email }` — envia um código de 6 dígitos por e-mail (vale 10 min; o código nunca volta na resposta; 503 se o e-mail não estiver configurado) |
| `POST` | `/api/auth/redefinir-senha` | **público** | `{ email, codigo, nova_senha }` — até 5 tentativas por código |
| `GET` | `/api/auth/me` | qualquer autenticado | Dados do usuário logado (valida se o token ainda vale) |

### Usuários  ·  `/api/usuarios`

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| `GET` | `/api/usuarios/profissionais` | qualquer autenticado | Professores, coordenadores e alunos ativos (só id, nome e perfil — sem CPF/e-mail) |
| `GET` | `/api/usuarios` | coordenador | Lista todos os usuários do sistema |
| `GET` | `/api/usuarios/:id` | coordenador | Dados de um usuário |
| `POST` | `/api/usuarios` | coordenador | Cadastra usuário (define perfil e senha inicial) |
| `PUT` | `/api/usuarios/:id` | coordenador | Edita cadastro, troca o perfil ou ativa/desativa |
| `DELETE` | `/api/usuarios/:id` | coordenador | Remove o usuário (409 se ele tiver histórico; nesse caso, desative) |

### Pacientes  ·  `/api/pacientes`

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| `GET` | `/api/pacientes` | aluno, professor, recepcionista | Lista pacientes (aceita `?ativo=true|false`) |
| `GET` | `/api/pacientes/cep/:cep` | qualquer autenticado | Busca endereço pelo CEP (via ViaCEP) |
| `GET` | `/api/pacientes/:id` | aluno, professor, recepcionista | Ficha do paciente |
| `POST` | `/api/pacientes` | professor, recepcionista | Cadastra paciente com a declaração de saúde (`saude`) |
| `PUT` | `/api/pacientes/:id` | aluno, professor, recepcionista | Edita o cadastro |
| `PATCH` | `/api/pacientes/:id/status` | professor, recepcionista | Ativa ou inativa o paciente |
| `GET` | `/api/pacientes/:id/alergias` | aluno, professor, recepcionista | Alergias registradas |
| `POST` | `/api/pacientes/:id/alergias` | aluno, professor, recepcionista | Registra alergia (substância e gravidade) |
| `DELETE` | `/api/pacientes/:id/alergias/:alergiaId` | professor | Remove a alergia |
| `GET` | `/api/pacientes/:id/medicamentos` | aluno, professor, recepcionista | Medicamentos em uso |
| `POST` | `/api/pacientes/:id/medicamentos` | aluno, professor, recepcionista | Registra medicamento em uso |
| `DELETE` | `/api/pacientes/:id/medicamentos/:medicamentoId` | professor | Remove o medicamento |
| `GET` | `/api/pacientes/:id/documentos` | aluno, professor, recepcionista | Lista documentos anexados |
| `POST` | `/api/pacientes/:id/documentos` | recepcionista | Anexa documento (arquivo de até 8 MB, enviado em base64) |
| `GET` | `/api/pacientes/:id/documentos/:documentoId/download` | aluno, professor, recepcionista | Baixa o arquivo |
| `DELETE` | `/api/pacientes/:id/documentos/:documentoId` | professor | Remove o documento |
| `GET` | `/api/pacientes/:id/evolucoes` | professor, aluno | Prontuário / evolução clínica |
| `POST` | `/api/pacientes/:id/evolucoes` | professor, aluno | Registra evolução clínica |
| `GET` | `/api/pacientes/:id/saude` | aluno, professor, recepcionista | Declaração de saúde: alergias, medicamentos e `saude_versao` |
| `PUT` | `/api/pacientes/:id/saude` | aluno, professor, recepcionista | Atualiza a declaração (envie a `saude_versao` lida; 409 se outra pessoa alterou antes). Só professor/coordenador remove ou altera itens já registrados |
| `GET` | `/api/pacientes/:id/historico` | aluno, professor, recepcionista | Linha do tempo: consultas, cirurgias, evoluções e documentos |

### Consultas  ·  `/api/consultas`

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| `GET` | `/api/consultas` | professor, aluno, recepcionista | Lista consultas (aceita `?status=` e `?disciplina=`) |
| `GET` | `/api/consultas/disciplinas` | qualquer autenticado | Lista as 8 disciplinas aceitas pelo sistema |
| `GET` | `/api/consultas/:id` | professor, aluno, recepcionista | Dados da consulta |
| `POST` | `/api/consultas` | professor, aluno, recepcionista | Agenda consulta |
| `PUT` | `/api/consultas/:id` | professor, aluno, recepcionista | Reagenda, cancela ou muda o status |
| `DELETE` | `/api/consultas/:id` | professor | Remove a consulta |
| `GET` | `/api/consultas/:id/materiais` | professor, aluno, recepcionista | Checklist de materiais previstos |
| `POST` | `/api/consultas/:id/materiais` | professor, aluno | Adiciona material ao checklist |
| `PUT` | `/api/consultas/:id/materiais/:materialVinculoId` | professor, aluno | Altera a quantidade prevista |
| `DELETE` | `/api/consultas/:id/materiais/:materialVinculoId` | professor, aluno | Remove o material do checklist |
| `GET` | `/api/consultas/:id/alunos` | aluno, professor, recepcionista | Equipe de alunos da consulta |
| `PUT` | `/api/consultas/:id/alunos` | professor responsável, coordenador | `{ alunos_ids: [...] }` — define a equipe e notifica os alunos novos |

`usuario_id` da consulta é o **professor responsável** (supervisor). Aluno vê
na agenda só as consultas em que é responsável ou está na equipe.

### Cirurgias e mutirões  ·  `/api/cirurgias`

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| `GET` | `/api/cirurgias/mutiroes` | professor, aluno, recepcionista | Lista mutirões cirúrgicos |
| `GET` | `/api/cirurgias/mutiroes/:mutiraoId` | professor, aluno, recepcionista | Dados do mutirão |
| `GET` | `/api/cirurgias/mutiroes/:mutiraoId/cirurgias` | professor, aluno, recepcionista | Cirurgias daquele mutirão |
| `POST` | `/api/cirurgias/mutiroes` | professor | Cria mutirão |
| `PUT` | `/api/cirurgias/mutiroes/:mutiraoId` | professor | Edita o mutirão |
| `DELETE` | `/api/cirurgias/mutiroes/:mutiraoId` | professor | Remove o mutirão |
| `GET` | `/api/cirurgias` | professor, aluno, recepcionista | Lista cirurgias (aceita `?status=` e `?mutirao_id=`) |
| `GET` | `/api/cirurgias/:id` | professor, aluno, recepcionista | Dados da cirurgia |
| `POST` | `/api/cirurgias` | professor, aluno | Agenda cirurgia |
| `PUT` | `/api/cirurgias/:id` | professor, aluno | Edita a cirurgia |
| `DELETE` | `/api/cirurgias/:id` | professor | Remove a cirurgia |
| `GET` | `/api/cirurgias/:id/alunos` | professor, aluno, recepcionista | Alunos vinculados à cirurgia |
| `POST` | `/api/cirurgias/:id/alunos` | professor | Vincula aluno (executante, auxiliar ou observador) |
| `DELETE` | `/api/cirurgias/:id/alunos/:vinculoId` | professor | Desvincula o aluno |
| `GET` | `/api/cirurgias/:id/materiais` | professor, aluno, recepcionista | Checklist de materiais da cirurgia |
| `POST` | `/api/cirurgias/:id/materiais` | professor, aluno | Adiciona material ao checklist |
| `PUT` | `/api/cirurgias/:id/materiais/:materialVinculoId` | professor, aluno | Altera a quantidade prevista |
| `DELETE` | `/api/cirurgias/:id/materiais/:materialVinculoId` | professor, aluno | Remove o material do checklist |

### Materiais  ·  `/api/materiais`

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| `GET` | `/api/materiais` | professor, aluno | Lista materiais (aceita `?busca=` por nome ou código de barras) |
| `GET` | `/api/materiais/:id` | professor, aluno | Dados do material, com status de estoque calculado |
| `POST` | `/api/materiais` | professor, aluno | Cadastra material |
| `PUT` | `/api/materiais/:id` | professor, aluno | Edita o material |
| `DELETE` | `/api/materiais/:id` | professor | Remove o material |
| `GET` | `/api/materiais/:id/qrcode` | professor, aluno | Gera o QR-Code de identificação |
| `GET` | `/api/materiais/:id/codigo-barras` | professor, aluno | Devolve o código de barras cadastrado |

### Categorias de material  ·  `/api/categorias`

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| `GET` | `/api/categorias` | professor, aluno | Lista categorias de material |
| `GET` | `/api/categorias/:id` | professor, aluno | Dados da categoria |
| `POST` | `/api/categorias` | professor | Cria categoria |
| `PUT` | `/api/categorias/:id` | professor | Renomeia a categoria |
| `DELETE` | `/api/categorias/:id` | professor | Remove a categoria |

### Movimentações de estoque  ·  `/api/movimentacoes`

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| `GET` | `/api/movimentacoes` | professor, aluno | Histórico de entradas e saídas (aceita `?material_id=`) |
| `GET` | `/api/movimentacoes/:id` | professor, aluno | Dados da movimentação |
| `POST` | `/api/movimentacoes` | professor, aluno | Rota antiga: repassa para `/api/rastreabilidade/materiais/:id/movimentos` (por lote) |
| `PUT` / `DELETE` | `/api/movimentacoes/:id` | professor, aluno | Bloqueado (405) — o histórico de estoque é imutável |

### Rastreabilidade: estoque por lote, pacotes CME e observações  ·  `/api/rastreabilidade`

Todas as rotas: aluno, professor e coordenador.

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/api/rastreabilidade/materiais/:id/lotes` | Lotes do material, com saldo e validade |
| `POST` | `/api/rastreabilidade/materiais/:id/movimentos` | Entrada (`lote`, `validade`, `data_recebimento`) ou saída (`lote_id`). Atualiza saldo do lote, saldo total e histórico numa única transação |
| `GET` | `/api/rastreabilidade/pacotes` | Lista pacotes CME |
| `POST` | `/api/rastreabilidade/pacotes` | Prepara pacote com vários instrumentais (`nome`, `itens: [{material_id, quantidade}]`) |
| `GET` | `/api/rastreabilidade/pacotes/:id` | Pacote com itens e histórico de eventos |
| `POST` | `/api/rastreabilidade/pacotes/:id/processar` | `acao`: `iniciar` (com `ciclo_id`), `liberar` (só professor/coordenador; exige ciclo concluído e controles aprovados) ou `utilizar` |
| `GET` | `/api/rastreabilidade/pacotes/:id/etiqueta` | Etiqueta com QR Code (só depois de liberado) |
| `GET` / `POST` | `/api/rastreabilidade/consulta/:id/observacoes` | Observações clínicas da consulta (aluno só se estiver na equipe) |
| `GET` / `POST` | `/api/rastreabilidade/cirurgia/:id/observacoes` | Observações clínicas da cirurgia |

### Esterilização (CME)  ·  `/api/esterilizacoes`

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| `GET` | `/api/esterilizacoes` | professor, aluno | Lista ciclos de esterilização |
| `GET` | `/api/esterilizacoes/:id` | professor, aluno | Dados do ciclo |
| `POST` | `/api/esterilizacoes` | professor, aluno | Abre um ciclo (vapor, calor seco ou plasma) |
| `PUT` | `/api/esterilizacoes/:id` | professor, aluno | Edita o ciclo |
| `DELETE` | `/api/esterilizacoes/:id` | professor | Remove o ciclo |
| `GET` | `/api/esterilizacoes/:id/pacotes` | professor, aluno | Pacotes daquele ciclo |
| `POST` | `/api/esterilizacoes/:id/pacotes` | professor, aluno | Monta pacote e gera o QR-Code |
| `GET` | `/api/esterilizacoes/pacotes/:pacoteId` | professor, aluno | Busca um pacote pelo id (usado pelo leitor de QR) |
| `GET` | `/api/esterilizacoes/pacotes/:pacoteId/qrcode` | professor, aluno | QR-Code do pacote |
| `PATCH` | `/api/esterilizacoes/pacotes/:pacoteId/status` | professor, aluno | Muda o status (esterilizado, utilizado, vencido) |
| `GET` | `/api/esterilizacoes/:id/controles` | professor, aluno | Testes de controle biológico do ciclo |
| `POST` | `/api/esterilizacoes/:id/controles` | professor, aluno | Registra teste de controle biológico |
| `GET` | `/api/esterilizacoes/:id/controles/:controleId` | professor, aluno | Dados do teste |
| `PUT` | `/api/esterilizacoes/:id/controles/:controleId` | professor, aluno | Lança o resultado (aprovado / reprovado) |
| `DELETE` | `/api/esterilizacoes/:id/controles/:controleId` | professor | Remove o teste |

### Notificações  ·  `/api/notificacoes`

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| `GET` | `/api/notificacoes` | qualquer autenticado | Notificações do usuário logado (aceita `?naoLidas=true`) |
| `GET` | `/api/notificacoes/nao-lidas` | qualquer autenticado | Contador para o badge do sino |
| `PATCH` | `/api/notificacoes/marcar-todas-lidas` | qualquer autenticado | Marca todas como lidas |
| `PATCH` | `/api/notificacoes/:id/lida` | qualquer autenticado | Marca uma como lida |
| `DELETE` | `/api/notificacoes/:id` | qualquer autenticado | Remove a notificação |
| `POST` | `/api/notificacoes` | professor | Envia notificação manual |

### Dashboard e relatórios  ·  `/api/dashboard`

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| `GET` | `/api/dashboard/resumo` | professor, aluno | Indicadores do dia (consultas, cirurgias, estoque, CME) |
| `GET` | `/api/dashboard/relatorio-pdf` | professor, aluno | Mesmos indicadores em PDF para impressão |

### Logs e auditoria  ·  `/api/logs`

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| `GET` | `/api/logs` | coordenador | Log de auditoria (tabela log_auditoria) (aceita `?nivel=` e `?limite=`) |

### Permissões  ·  `/api/permissoes`

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| `GET` | `/api/permissoes` | coordenador | Matriz de permissões por perfil (aceita `?perfil=`) |

---

## Observações sobre datas

As colunas de data/hora são `timestamp without time zone`: guardam a hora
local da clínica. A API devolve e aceita o formato `AAAA-MM-DDTHH:MM:SS`,
**sem** sufixo de fuso — enviar um valor em UTC (com `Z`) faria o horário
ser gravado deslocado.

## Rotas fora de `/api`

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Verificação de disponibilidade — `{"status":"ok"}` |
| `GET` | `/metrics` | Uptime, requisições, memória e versão do Node — exige token de coordenador |
