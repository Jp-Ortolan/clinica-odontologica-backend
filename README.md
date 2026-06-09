# Clínica Odontológica — Backend

Sistema de gestão para clínica odontológica universitária — TCC Engenharia de Software.

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Banco de dados | PostgreSQL 18 |
| Autenticação | bcrypt + JWT (8h) |
| Documentação | Swagger / OpenAPI |
| Testes | Jest + Supertest |
| API externa | ViaCEP |
| Deploy | Render |
| Containers | Docker |
| CI/CD | GitHub Actions |

## Estrutura de Pastas

```
clinica-odontologica-backend/
├── src/
│   ├── config/
│   │   ├── database.js        # Pool de conexão PostgreSQL
│   │   └── env.js             # Validação de variáveis de ambiente
│   ├── controllers/           # Recebe req/res → chama Service
│   ├── services/              # Regras de negócio
│   ├── repositories/          # Queries SQL ao banco
│   ├── middlewares/
│   │   ├── auth.js            # Verificação JWT
│   │   └── errorHandler.js    # Tratamento global de erros
│   ├── routes/
│   │   └── index.js           # Agrega todas as rotas em /api
│   ├── utils/
│   │   ├── viaCep.js          # Busca endereço por CEP
│   │   ├── jwt.js             # Geração de token
│   │   └── qrcode.js          # Geração de QR Code
│   └── app.js                 # Configuração do Express
├── docs/
│   ├── swagger.js             # Setup do Swagger UI
│   └── swagger.json           # Especificação OpenAPI
├── tests/
│   ├── integration/           # Testes com Supertest
│   └── setup.js
├── migrations/                # Arquivos SQL de migração
├── .env.example
├── .gitignore
├── package.json
└── server.js                  # Entry point
```

## Arquitetura

```
Requisição HTTP
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
| Pacientes | paciente, alergia_paciente, medicamento_paciente |
| Consultas | consulta |
| Cirurgias | cirurgia |
| Materiais / Estoque | material, movimentacao_estoque |
| Esterilização | esterilizacao, pacote_esterilizado |

## Perfis de Acesso

| Perfil | Permissões |
|---|---|
| professor | Acesso total |
| aluno | Consultas prontuario e cirurgias sob supervisão |
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

# 4. Acessar a documentação
# http://localhost:3000/api-docs
```

## Variáveis de Ambiente

```env
PORT=3000
DATABASE_URL=postgresql://usuario:senha@localhost:5432/clinica_odontologica
JWT_SECRET=sua_chave_secreta_aqui
```

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

---

