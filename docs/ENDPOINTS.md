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

O sistema tem três perfis, e cada rota declara quais deles podem acessá-la
(middleware `perfil.js`). Uma chamada com perfil não autorizado recebe
`403 Acesso negado`.

| Perfil | Escopo |
|---|---|
| `professor` | Acesso amplo, incluindo exclusões, logs e gestão de usuários |
| `aluno` | Atendimento clínico, estoque e CME |
| `recepcionista` | Agendamento, cadastro de pacientes e documentos |

Regras que valem a pena destacar:

- **Estoque e CME** são fechados para a recepção — ela não repõe material nem
  opera a autoclave.
- **Prontuário** (evolução clínica e medicamentos em uso) é restrito a
  professor e aluno. A recepção pode registrar alergia, informação que o
  paciente costuma dar no balcão.
- **Exclusões** (`DELETE`) são quase todas exclusivas do professor.
- **Notificações** são individuais: cada usuário só lê e altera as suas.

## Códigos de resposta

| Código | Significado |
|---|---|
| `200` / `201` | Sucesso |
| `400` | Dados inválidos (campo obrigatório, valor fora da lista aceita) |
| `401` | Token ausente, inválido ou expirado |
| `403` | Perfil sem permissão para a rota |
| `404` | Registro não encontrado |
| `409` | Conflito (CPF duplicado, estoque insuficiente, vínculo repetido) |

## Endpoints

### Autenticação  ·  `/api/auth`

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| `POST` | `/api/auth/login` | **público** | Autentica e devolve o token JWT + dados do usuário |
| `POST` | `/api/auth/recuperar-senha` | **público** | Gera token de recuperação de senha |
| `POST` | `/api/auth/redefinir-senha` | **público** | Define a nova senha usando o token recebido |
| `GET` | `/api/auth/me` | qualquer autenticado | Dados do usuário logado (valida se o token ainda vale) |

### Usuários  ·  `/api/usuarios`

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| `GET` | `/api/usuarios` | professor, recepcionista | Lista todos os usuários do sistema |
| `GET` | `/api/usuarios/:id` | professor, recepcionista | Dados de um usuário |
| `POST` | `/api/usuarios` | professor | Cadastra usuário (define perfil e senha inicial) |
| `PUT` | `/api/usuarios/:id` | professor | Edita cadastro, troca o perfil ou ativa/desativa |
| `DELETE` | `/api/usuarios/:id` | professor | Remove o usuário em definitivo |

### Pacientes  ·  `/api/pacientes`

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| `GET` | `/api/pacientes` | aluno, professor, recepcionista | Lista pacientes (aceita `?ativo=true|false`) |
| `GET` | `/api/pacientes/cep/:cep` | qualquer autenticado | Busca endereço pelo CEP (via ViaCEP) |
| `GET` | `/api/pacientes/:id` | aluno, professor, recepcionista | Ficha do paciente |
| `POST` | `/api/pacientes` | professor, recepcionista | Cadastra paciente |
| `PUT` | `/api/pacientes/:id` | professor, recepcionista | Edita o cadastro |
| `PATCH` | `/api/pacientes/:id/status` | professor, recepcionista | Ativa ou inativa o paciente |
| `DELETE` | `/api/pacientes/:id` | professor | Remove o paciente |
| `GET` | `/api/pacientes/:id/alergias` | aluno, professor, recepcionista | Alergias registradas |
| `POST` | `/api/pacientes/:id/alergias` | aluno, professor, recepcionista | Registra alergia (substância e gravidade) |
| `DELETE` | `/api/pacientes/:id/alergias/:alergiaId` | professor, aluno | Remove a alergia |
| `GET` | `/api/pacientes/:id/medicamentos` | aluno, professor, recepcionista | Medicamentos em uso |
| `POST` | `/api/pacientes/:id/medicamentos` | professor, aluno | Registra medicamento em uso |
| `DELETE` | `/api/pacientes/:id/medicamentos/:medicamentoId` | professor, aluno | Remove o medicamento |
| `GET` | `/api/pacientes/:id/documentos` | aluno, professor, recepcionista | Lista documentos anexados |
| `POST` | `/api/pacientes/:id/documentos` | professor, recepcionista | Anexa documento (arquivo em base64, até 10MB) |
| `GET` | `/api/pacientes/:id/documentos/:documentoId/download` | aluno, professor, recepcionista | Baixa o arquivo |
| `DELETE` | `/api/pacientes/:id/documentos/:documentoId` | professor | Remove o documento |
| `GET` | `/api/pacientes/:id/evolucoes` | professor, aluno | Prontuário / evolução clínica |
| `POST` | `/api/pacientes/:id/evolucoes` | professor, aluno | Registra evolução clínica |

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
| `POST` | `/api/movimentacoes` | professor, aluno | Registra entrada ou saída e ajusta o estoque |
| `PUT` | `/api/movimentacoes/:id` | professor, aluno | Bloqueado por design — movimentação é imutável |
| `DELETE` | `/api/movimentacoes/:id` | professor | Remove e desfaz o efeito no estoque |

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
| `GET` | `/api/logs` | professor | Log de auditoria (aceita `?nivel=` e `?limite=`) |

### Permissões  ·  `/api/permissoes`

| Método | Rota | Quem pode | O que faz |
|---|---|---|---|
| `GET` | `/api/permissoes` | professor | Matriz de permissões por perfil (aceita `?perfil=`) |

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
| `GET` | `/metrics` | Uptime, total de requisições, memória e versão do Node |
