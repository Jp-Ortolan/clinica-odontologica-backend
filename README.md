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
| Documentação da API | [`docs/ENDPOINTS.md`](docs/ENDPOINTS.md) |
| Deploy | Railway (em produção) |

## Aplicação no ar

| | |
|---|---|
| **API** | https://clinica-odontologica-backend-production.up.railway.app |
| **Health check** | [`/health`](https://clinica-odontologica-backend-production.up.railway.app/health) — responde `{"status":"ok"}` |
| **Métricas** | `/metrics` — uptime, requisições, memória (exige token de professor/coordenador) |
| **Base das rotas** | `/api` (ex.: `/api/pacientes`) |
| **Front-end** | https://clinicaodontologica-frontend.vercel.app |

Todas as rotas sob `/api` exigem token JWT, obtido em `POST /api/auth/login`.
A lista completa está em [`docs/ENDPOINTS.md`](docs/ENDPOINTS.md).

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
├── migrations/                # migrations versionadas, aplicadas em ordem no deploy
│   ├── 001_create_tables.sql  # Modelagem inicial
│   ├── ...
│   └── 013_corrige_documento_paciente.sql
│   └── archive/               # Versão abandonada da 002 (ver comentário nela)
├── tests/                     # testes automatizados (Jest + Supertest)
├── scripts/
├── .env.example
├── .dockerignore
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
└── server.js                  # Entry point
```

Módulos atuais: `auth`, `usuario`, `paciente`, `consulta`, `cirurgia`, `material`, `categoria`, `movimentacao`, `esterilizacao`, `notificacao`, `dashboard`, `log` e `permissao` — cada um com controller, service, repository e rotas próprias.

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
| Pacientes | paciente, documento_paciente, alergia_paciente, medicamento_paciente, evolucao_paciente |
| Consultas | consulta, consulta_material |
| Cirurgias | cirurgia, cirurgia_aluno, cirurgia_material, mutirao_cirurgico |
| Materiais / Estoque | material, categoria, movimentacao_estoque |
| Esterilização (CME) | esterilizacao, pacote_esterilizado, controle_biologico |
| Notificações | notificacao |
| Dashboard e relatórios | (consulta as tabelas acima) |
| Logs e permissões | log_auditoria + matriz gerada a partir das rotas (`config/permissoes.js`) |

Todos os endpoints têm regra de negócio, autenticação e
controle de permissão por perfil.

## Perfis de Acesso

| Perfil | Permissões |
|---|---|
| coordenador | Tudo o que o professor pode; único que gerencia contas de coordenador |
| professor | Acesso total aos módulos clínicos e administrativos |
| aluno | Consultas, prontuário e cirurgias sob supervisão |
| recepcionista | Agendamento e cadastro de pacientes |

## Primeiros Passos

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# 3. Aplicar as migrations no banco
npm run migrate

# 4. Rodar em desenvolvimento
npm run dev
```

O `npm run migrate` controla o que já foi aplicado na tabela `_migrations`
(nome do arquivo + checksum), então pode ser executado várias vezes sem
repetir migration. No Railway ele roda sozinho antes de a API subir
(ver `Dockerfile`).

Regras para migrations:

- **Nunca renomeie nem edite** uma migration já aplicada: o deploy para com
  erro se o conteúdo mudar. Para corrigir algo, crie uma migration nova.
- Use o próximo número livre; dois arquivos com o mesmo número são recusados.
- Nada de `DROP` sem antes conferir se há dados (veja a trava na 013).

Para criar o primeiro usuário num banco novo:

```bash
SEED_ADMIN_EMAIL=coordenacao@clinica.com SEED_ADMIN_SENHA='uma-senha-forte' npm run seed:admin
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

### Backup automático (Sprint 5 — DevOps)

Enquanto o `docker compose up` estiver rodando, o serviço `backup` tira um
dump do Postgres a cada 6h (pasta `./backups`, gerada localmente e fora do
Git) e apaga dumps com mais de 7 dias. Para restaurar um backup específico:

```bash
docker compose exec db pg_restore -U postgres -d clinica_odontologica --clean /backups/<arquivo>.dump
```

## Testes

```bash
npm test
```

Executa os testes automatizados (Jest + Supertest) com mocks de banco de dados.
No CI, as migrations também são aplicadas num PostgreSQL de verdade.

## Variáveis de Ambiente

```env
PORT=3000
NODE_ENV=development            # production no Railway (liga SSL do Postgres)
DATABASE_URL=postgresql://usuario:senha@localhost:5432/clinica_odontologica
JWT_SECRET=sua_chave_secreta_aqui
# Opcional: front-ends liberados no CORS (separados por vírgula).
# Padrão: o front da Vercel e http://localhost:5173
CORS_ORIGINS=https://clinicaodontologica-frontend.vercel.app
```

## CI/CD

O workflow `.github/workflows/ci.yml` roda a cada push/PR para `main` ou `develop`: testes automatizados, migrations aplicadas do zero num PostgreSQL real (duas vezes, para garantir que são idempotentes), build da imagem Docker e `npm audit`.

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
