const QRCode = require('qrcode');

async function gerarQRCode(texto) {
  return QRCode.toDataURL(texto);
}

module.exports = { gerarQRCode };
