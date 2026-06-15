# Clínica Odontológica — Backend

Sistema de gestão para clínica odontológica universitária 

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Banco de dados | PostgreSQL 16 |
| Autenticação | bcrypt + JWT |
| Testes | Jest + Supertest |
| API externa | ViaCEP |
| Containers | Docker / Docker Compose |
| CI/CD | GitHub Actions |
| Documentação da API | Swagger / OpenAPI (planejado) |
| Deploy | Render (planejado) |

## Estrutura de Pastas

```
clinica-odontologica-backend/
├── src/
│   ├── config/
│   │   ├── database.js        # Pool de conexão PostgreSQL
│   │   └── env.js             # Validação de variáveis de ambiente
│   ├── controllers/           # Recebe req/res → chama Service (1 por módulo)
│   ├── services/              # Regras de negócio (1 por módulo)
│   ├── repositories/          # Queries SQL ao banco (1 por módulo)
│   ├── middlewares/
│   │   ├── auth.js            # Verificação do token JWT
│   │   ├── perfil.js          # Controle de permissões por perfil (RBAC)
│   │   └── errorHandler.js    # Tratamento global de erros
│   ├── routes/
│   │   ├── index.js           # Agrega todas as rotas em /api
│   │   └── ...                # 1 arquivo de rotas por módulo
│   ├── utils/
│   │   ├── viaCep.js          # Busca endereço por CEP
│   │   ├── jwt.js             # Geração/verificação de token
│   │   └── qrcode.js          # Geração de QR Code
│   └── app.js                 # Configuração do Express
├── migrations/
│   ├── 001_create_tables.sql          # Criação das tabelas (modelagem inicial)
│   └── 002_ajustes_modelagem_fase3.sql # Ajustes de modelagem (Fase 3)
├── tests/
│   ├── auth.test.js           # Testes de login (4 testes)
│   ├── pacientes.test.js      # Testes da API de pacientes (8 testes)
│   └── setup.js               # Configuração do ambiente de testes
├── scripts/
├── .env.example
├── .dockerignore
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
└── server.js                  # Entry point
```

Módulos atuais: `auth`, `usuario`, `paciente`, `consulta`, `cirurgia`, `material`, `movimentacao`, `esterilizacao` — cada um com controller, service, repository e rotas próprias.

## Arquitetura

Arquitetura em camadas (padrão Controller-Service-Repository):

```
Requisição HTTP
      │
      ▼
  Middlewares   ← auth (JWT) + perfil (controle de acesso por perfil)
      │
      ▼
  Controller    ← valida entrada, monta resposta HTTP
      │
      ▼
   Service      ← aplica regras de negócio
      │
      ▼
  Repository    ← executa queries no PostgreSQL
      │
      ▼
  PostgreSQL
```

## Módulos

| Módulo | Tabela(s) |
|---|---|
| Autenticação | usuario |
| Usuários | usuario |
| Pacientes | paciente, documento_paciente |
| Consultas | consulta |
| Cirurgias | cirurgia |
| Materiais / Estoque | material, movimentacao_estoque |
| Esterilização | esterilizacao, pacote_esterilizado |

Os módulos de **Autenticação** e **Pacientes** já possuem regra de negócio completa e testes automatizados. Os demais já têm rotas, autenticação e permissões configuradas; a regra de negócio está em desenvolvimento, seguindo o mesmo padrão.

## Perfis de Acesso

| Perfil | Permissões |
|---|---|
| professor | Acesso total |
| aluno | Consultas, prontuário e cirurgias sob supervisão |
| recepcionista | Agendamento e cadastro de pacientes |

## Primeiros Passos

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# 3. Rodar em desenvolvimento
npm run dev
```

## Rodando com Docker

```bash
# Requer o Docker Desktop em execução
docker compose up
```

Sobe o backend e o banco PostgreSQL juntos, já configurados e conectados. Para parar:

```bash
docker compose down
```

## Testes

```bash
npm test
```

Executa os testes automatizados (Jest + Supertest) com mocks de banco de dados — atualmente 14 testes (login + pacientes), todos passando.

## Variáveis de Ambiente

```env
PORT=3000
DATABASE_URL=postgresql://usuario:senha@localhost:5432/clinica_odontologica
JWT_SECRET=sua_chave_secreta_aqui
```

## CI/CD

O workflow `.github/workflows/ci.yml` roda automaticamente a cada push/PR para `main` ou `develop`: instala as dependências, verifica erros de sintaxe, builda a imagem Docker e roda `npm audit`.

## Convenções

### Branches
- main — produção
- develop — integração
- feature/<nome> — nova funcionalidade
- fix/<nome> — correção de bug
- hotfix/<nome> — correção urgente em produção

### Commits (Conventional Commits)
- feat: nova funcionalidade
- fix: correção de bug
- docs: documentação
- refactor: refatoração sem mudança de comportamento
- test: adição ou correção de testes
- chore: tarefas de build/config
