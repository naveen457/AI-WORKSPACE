const axios = require("axios");
const { logInfo, logError } = require("./logger");

function assertMailConfig() {
  const required = ["SMTP_PASS", "SMTP_USER"];

  const missing = required.filter((k) => !process.env[k]);

  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}

async function sendOtpEmail({ to, otp, purpose = "email verification" }) {
  assertMailConfig();

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
    logInfo("Sending OTP through Brevo API", {
      to,
      purpose,
    });

    const { data } = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "ASTRIX",
          email: process.env.SMTP_USER,
        },

        to: [
          {
            email: to,
          },
        ],

        subject,

        htmlContent: html,

        textContent: `Your OTP is ${otp}. It expires in 10 minutes.`,
      },
      {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": process.env.SMTP_PASS,
        },
      },
    );

    logInfo("OTP Email Sent", data);

    return {
      messageId: data.messageId,
      accepted: [to],
      rejected: [],
      response: "OK",
    };
  } catch (err) {
    logError("Brevo API Error", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });

    throw err;
  }
}

module.exports = {
  sendOtpEmail,
};
