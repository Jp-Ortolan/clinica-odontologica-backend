const axios = require('axios');

function verificarConfiguracao() {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.JWT_SECRET) {
    throw { status: 503, message: 'Recuperação por e-mail indisponível. Contate a administração.' };
  }
}

async function enviarCodigo(email, codigo) {
  verificarConfiguracao();
  try {
    await axios.post('https://api.resend.com/emails', {
      from: process.env.EMAIL_FROM,
      to: [email],
      subject: 'Código para recuperar sua senha — Clínica Odontológica',
      text: `Seu código de confirmação é: ${codigo}\n\nEle expira em 10 minutos e só pode ser usado uma vez. Se você não solicitou a recuperação, ignore esta mensagem.`,
    }, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      timeout: 15000,
    });
  } catch {
    // Não registrar o erro Axios: ele contém credenciais e o código no payload.
    throw { status: 503, message: 'Não foi possível enviar o código. Tente novamente em alguns minutos.' };
  }
}

module.exports = { verificarConfiguracao, enviarCodigo };
