const twilio = require("twilio");

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_WINDOW_MS = 60 * 60 * 1000;
const OTP_MAX_SENDS_PER_WINDOW = 5;
const OTP_MAX_FAILED_ATTEMPTS = 5;

function createPhoneOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizePhoneNumber(value) {
  const raw = value?.trim().replace(/[\s()-]/g, "") || "";
  if (!raw) {
    return "";
  }

  let normalized = raw;
  if (!normalized.startsWith("+")) {
    const defaultCountryCode =
      process.env.PHONE_OTP_DEFAULT_COUNTRY_CODE?.trim() || "";
    if (!defaultCountryCode) {
      return "";
    }
    normalized = `${defaultCountryCode}${normalized}`;
  }

  if (!/^\+[1-9][0-9]{9,14}$/.test(normalized)) {
    return "";
  }

  return normalized;
}

function getOtpWindowState(user, now = new Date()) {
  const windowStart = user.phoneOtpWindowStartAt;
  const isExistingWindow =
    windowStart && now.getTime() - windowStart.getTime() < OTP_WINDOW_MS;

  return {
    resendCount: isExistingWindow ? user.phoneOtpResendCount || 0 : 0,
    windowStartAt: isExistingWindow ? windowStart : now,
  };
}

function getSendLimit(user, now = new Date()) {
  const { resendCount } = getOtpWindowState(user, now);

  if (
    user.phoneOtpLastSentAt &&
    now.getTime() - user.phoneOtpLastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(
        (OTP_RESEND_COOLDOWN_MS -
          (now.getTime() - user.phoneOtpLastSentAt.getTime())) /
          1000,
      ),
      message: "Please wait before requesting another OTP",
    };
  }

  if (resendCount >= OTP_MAX_SENDS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(OTP_WINDOW_MS / 1000),
      message: "Too many OTP requests. Please try again later.",
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    message: "",
  };
}

function getOtpProvider() {
  return (
    process.env.PHONE_OTP_PROVIDER || "development-console"
  ).toLowerCase();
}

function createTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error(
      "Twilio credentials are not configured: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required",
    );
  }

  return twilio(accountSid, authToken);
}

async function sendViaTwilio({ phoneNumber, otp }) {
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!fromPhone) {
    throw new Error("TWILIO_PHONE_NUMBER is required for Twilio OTP delivery");
  }

  const client = createTwilioClient();
  const body = `Your verification code is ${otp}. It will expire in ${Math.floor(
    OTP_EXPIRY_MS / 60000,
  )} minutes.`;

  try {
    const message = await client.messages.create({
      body,
      from: fromPhone,
      to: phoneNumber,
    });

    console.info("Twilio SMS sent", {
      provider: "twilio",
      to: phoneNumber,
      sid: message.sid,
      status: message.status,
    });

    return {
      provider: "twilio",
      providerResponse: {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
      },
    };
  } catch (error) {
    const isTrialError = error.code === 21608;
    const message = isTrialError
      ? "Twilio trial account limitation: destination number may be unverified or not supported."
      : error.message;

    console.error("Twilio send failed", {
      provider: "twilio",
      to: phoneNumber,
      code: error.code,
      message,
      moreInfo: error.moreInfo,
      stack: error.stack,
    });

    const providerError = new Error(message);
    providerError.code = error.code;
    providerError.moreInfo = error.moreInfo;
    throw providerError;
  }
}

async function sendPhoneOtp({ phoneNumber, otp }) {
  const provider = getOtpProvider();

  if (provider === "twilio") {
    return await sendViaTwilio({ phoneNumber, otp });
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`Phone OTP for ${phoneNumber}: ${otp}`);
  }

  return {
    provider,
    providerResponse: null,
  };
}

module.exports = {
  OTP_EXPIRY_MS,
  OTP_MAX_FAILED_ATTEMPTS,
  createPhoneOtp,
  getOtpWindowState,
  getSendLimit,
  normalizePhoneNumber,
  sendPhoneOtp,
};
