const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./middlewares/logger');
const auth = require('./middlewares/auth');
const autorizar = require('./middlewares/perfil');

const app = express();

// No Railway a API fica atrás de um proxy: sem isso todas as requisições
// pareceriam vir do mesmo IP e o limite de tentativas valeria para todos.
app.set('trust proxy', 1);

// ── Monitoramento: contador de requisições em memória ─────────
// Reinicia quando o processo reinicia — suficiente para homologação.
const metricas = { totalRequests: 0, startTime: Date.now() };

app.use((req, res, next) => {
  metricas.totalRequests += 1;
  next();
});

app.use(logger);
// crossOriginResourcePolicy liberado: o front (outro domínio) baixa PDFs e
// imagens de QR Code desta API.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS: só os front-ends conhecidos. Configure CORS_ORIGINS no ambiente
// (lista separada por vírgula) para liberar outros endereços.
const ORIGENS_PADRAO = [
  'https://clinicaodontologica-frontend.vercel.app',
  'http://localhost:5173',
];
const origensPermitidas = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors({
  origin: origensPermitidas.length ? origensPermitidas : ORIGENS_PADRAO,
}));

// Documentos de paciente chegam em base64 (o front limita o arquivo a 8 MB;
// em base64 isso vira ~10,7 MB, por isso 12 MB aqui).
app.use(express.json({ limit: '12mb' }));

// Limite de tentativas nas rotas públicas de autenticação (força bruta e
// abuso do envio de e-mail de recuperação). Desligado nos testes.
const limiteAutenticacao = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});
app.use(['/api/auth/login', '/api/auth/recuperar-senha', '/api/auth/redefinir-senha'], limiteAutenticacao);

// Healthcheck — usado pelo Railway e por monitoramento externo.
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Métricas básicas — só para a coordenação (expõe versão e ambiente).
app.get('/metrics', auth, autorizar('coordenador'), (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - metricas.startTime) / 1000);
  res.status(200).json({
    status: 'ok',
    uptime_seconds: uptimeSeconds,
    total_requests: metricas.totalRequests,
    memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    node_version: process.version,
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/api', routes);

// Rota inexistente → 404 em JSON (antes o Express devolvia uma página HTML).
app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

app.use(errorHandler);

module.exports = app;
