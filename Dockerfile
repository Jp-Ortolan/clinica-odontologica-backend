# ============================================================
# Dockerfile — Clínica Odontológica Backend (usado pelo Railway)
# ============================================================
FROM node:20-slim

WORKDIR /app

# Dependências primeiro (aproveita o cache do Docker). npm ci instala
# exatamente o que está no package-lock.json.
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Não roda como root dentro do container.
USER node

EXPOSE 3000

# Aplica as migrations pendentes e só então sobe a API. Se uma migration
# falhar, o container não sobe e o Railway mantém a versão anterior no ar.
CMD ["sh", "-c", "node scripts/migrate.js && exec node server.js"]
