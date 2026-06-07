const jwt = require('jsonwebtoken');

function gerarToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
}

module.exports = { gerarToken };
