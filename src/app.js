const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', routes);

// Swagger — será configurado futuramente
// const swaggerSetup = require('../docs/swagger');
// swaggerSetup(app);

app.use(errorHandler);

module.exports = app;
