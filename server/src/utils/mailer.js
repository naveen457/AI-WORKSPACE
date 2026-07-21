const { Resend } = require("resend");
const { logInfo, logError } = require("./logger");

function assertMailConfig() {
  const required = ["RESEND_API_KEY"];

  const missing = required.filter((k) => !process.env[k]);

  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}

function getMailAddresses() {
  return {
    from: process.env.RESEND_FROM || "Astrix <noreply@astrix-app.me>",
    replyTo: process.env.RESEND_REPLY_TO || "support@astrix-app.me",
  };
}

async function sendOtpEmail({ to, otp, purpose = "email verification" }) {
  assertMailConfig();

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { from, replyTo } = getMailAddresses();
  const isPasswordReset = purpose === "password reset";

  const subject = isPasswordReset
    ? "Your ASTRIX Password Reset Code"
    : "Your ASTRIX Verification Code";

  const title = isPasswordReset ? "Password Reset" : "Email Verification";

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2>ASTRIX ${title}</h2>

      <p>Your verification code is:</p>

      <h1 style="
          color:#2563eb;
          letter-spacing:6px;
          text-align:center;
      ">
          ${otp}
      </h1>

      <p>
          This code expires in
          <strong>10 minutes</strong>.
      </p>

      <hr>

      <p style="font-size:13px;color:#777">
          If you didn't request this code,
          you can safely ignore this email.
      </p>
  </div>
  `;

  try {
    logInfo("Sending OTP through Resend API", {
      to,
      purpose,
    });

    const { data, error } = await resend.emails.send({
      from,
      replyTo,
      to,
      subject,
      html,
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    });

    if (error) {
      throw error;
    }

    logInfo("OTP email sent through Resend", {
      id: data?.id,
      to,
      purpose,
    });

    return {
      messageId: data?.id,
      accepted: [to],
      rejected: [],
      response: "OK",
    };
  } catch (err) {
    logError("Resend API Error", {
      status: err.statusCode || err.status,
      name: err.name,
      message: err.message,
    });

    throw err;
  }
}

module.exports = {
  sendOtpEmail,
};
