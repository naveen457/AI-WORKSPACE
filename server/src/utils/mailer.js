const nodemailer = require("nodemailer");

function getMailTransporter() {
  const port = Number(process.env.SMTP_PORT || 587);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function assertMailConfig() {
  const requiredKeys = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
  const missingKeys = requiredKeys.filter((key) => !process.env[key]);

  if (missingKeys.length > 0) {
    throw new Error(`Missing email config: ${missingKeys.join(", ")}`);
  }
}

async function sendOtpEmail({ to, otp, purpose = "email verification" }) {
  assertMailConfig();

  const transporter = getMailTransporter();
  const isPasswordReset = purpose === "password reset";
  const title = isPasswordReset
    ? "AI Workspace password reset"
    : "AI Workspace email verification";

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: isPasswordReset
      ? "Your AI Workspace password reset code"
      : "Your AI Workspace verification code",
    text: `Your AI Workspace ${purpose} code is ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>${title}</h2>
        <p>Your verification code is:</p>
        <p style="font-size: 24px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });
}

module.exports = {
  sendOtpEmail,
};
