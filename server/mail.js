import nodemailer from "nodemailer";

export function isEmailConfigured() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return true;
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

function mailFrom() {
  return process.env.MAIL_FROM || `Vegas · Кнопка контакта <${process.env.SMTP_USER}>`;
}

function otpHtml(code, fullName) {
  const greeting = fullName ? `Здравствуйте, ${fullName}!` : "Здравствуйте!";
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
      <p>${greeting}</p>
      <p>Код для входа в Vegas · Кнопка контакта:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#5bba47">${code}</p>
      <p style="color:#666">Код действителен 1 час. Если вы не запрашивали вход, просто проигнорируйте письмо.</p>
    </div>
  `;
}

export async function sendOtpEmail(email, code, fullName) {
  const subject = "Код входа — Vegas · Кнопка контакта";
  const html = otpHtml(code, fullName);
  const text = `${fullName ? `${fullName}, ` : ""}код для входа: ${code}. Действителен 1 час.`;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE !== "false",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({
      from: mailFrom(),
      to: email,
      subject,
      text,
      html,
    });
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.MAIL_FROM,
    to: email,
    subject,
    html,
  });
}
