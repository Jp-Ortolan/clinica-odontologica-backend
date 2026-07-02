const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./middlewares/logger');

const app = express();

// ── Monitoramento: contador de requisições em memória ─────────
// Reinicia quando o processo reinicia — suficiente para homologação.
const metricas = { totalRequests: 0, startTime: Date.now() };

app.use((req, res, next) => {
  metricas.totalRequests += 1;
  next();
});

app.use(logger);
app.use(cors());
app.use(express.json());

// Healthcheck — usado pelo Render e por monitoramento externo.
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Métricas básicas de monitoramento da aplicação.
app.get('/metrics', (req, res) => {
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

app.use(errorHandler);

module.exports = app;
