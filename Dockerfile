# ============================================================
# Dockerfile — Clínica Odontológica Backend
# ============================================================

# Imagem base: Node.js 20 versão slim (menor tamanho)
FROM node:20-slim

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependências primeiro (otimiza cache do Docker)
COPY package*.json ./

# Instala apenas as dependências de produção
RUN npm install --omit=dev

# Copia o restante do código
COPY . .

# Expõe a porta que o servidor usa
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "server.js"]
