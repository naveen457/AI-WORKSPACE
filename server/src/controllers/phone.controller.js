const bcrypt = require("bcrypt");

const User = require("../models/User.js");
const {
  OTP_EXPIRY_MS,
  OTP_MAX_FAILED_ATTEMPTS,
  createPhoneOtp,
  getOtpWindowState,
  getSendLimit,
  normalizePhoneNumber,
  sendPhoneOtp,
} = require("../services/phoneOtp.service.js");

const BCRYPT_SALT_ROUNDS = 12;

function getPublicUser(user) {
  return {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    dateOfBirth: user.dateOfBirth || "",
    gender: user.gender || "",
    phone: user.phoneNumber || "",
    phoneNumber: user.phoneNumber || "",
    phoneVerified: Boolean(user.isPhoneVerified),
    isPhoneVerified: Boolean(user.isPhoneVerified),
    address: user.address || "",
    profilePhoto: user.profilePhoto || "",
  };
}

async function sendOtp(req, res) {
  try {
    const phoneNumber = normalizePhoneNumber(req.body.phoneNumber);

    if (!phoneNumber) {
      return res.status(400).json({
        message: "Enter a valid phone number with country code",
      });
    }

    const user = await User.findById(req.auth.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.phoneNumber === phoneNumber && user.isPhoneVerified) {
      return res.status(200).json({
        message: "Phone number is already verified",
        alreadyVerified: true,
        user: getPublicUser(user),
      });
    }

    const now = new Date();
    const sendLimit = getSendLimit(user, now);

    if (!sendLimit.allowed) {
      return res.status(429).json({
        message: sendLimit.message,
        retryAfterSeconds: sendLimit.retryAfterSeconds,
      });
    }

    const otp = createPhoneOtp();
    const otpHash = await bcrypt.hash(otp, BCRYPT_SALT_ROUNDS);
    const { resendCount, windowStartAt } = getOtpWindowState(user, now);

    const providerResponse = await sendPhoneOtp({
      phoneNumber,
      otp,
    });

    user.phoneNumber = phoneNumber;
    user.isPhoneVerified = false;
    user.phoneOtpHash = otpHash;
    user.phoneOtpExpiry = new Date(now.getTime() + OTP_EXPIRY_MS);
    user.phoneOtpResendCount = resendCount + 1;
    user.phoneOtpWindowStartAt = windowStartAt;
    user.phoneOtpLastSentAt = now;
    user.phoneOtpFailedAttempts = 0;

    await user.save();

    const responseBody = {
      message: "OTP sent to phone number",
      expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
      resendAfterSeconds: 60,
      user: getPublicUser(user),
      provider:
        providerResponse?.provider ||
        process.env.PHONE_OTP_PROVIDER ||
        "development-console",
    };

    if (process.env.NODE_ENV === "development") {
      responseBody.debugOtp = otp;
    }

    return res.status(200).json(responseBody);
  } catch (error) {
    console.error("sendOtp error", {
      error: error.message,
      stack: error.stack,
      body: req.body,
      authId: req.auth?.id,
    });

    return res.status(500).json({
      message: "Unable to send phone OTP",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

async function verifyOtp(req, res) {
  try {
    const phoneNumber = normalizePhoneNumber(req.body.phoneNumber);
    const otp = req.body.otp?.trim();

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        message: "Phone number and OTP are required",
      });
    }

    if (!/^[0-9]{6}$/.test(otp)) {
      return res.status(400).json({
        message: "Enter the 6-digit OTP",
      });
    }

    const user = await User.findById(req.auth.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.phoneNumber !== phoneNumber) {
      return res.status(400).json({
        message: "Request a new OTP for this phone number",
      });
    }

    if (user.isPhoneVerified) {
      return res.status(200).json({
        message: "Phone number already verified",
        user: getPublicUser(user),
      });
    }

    if (!user.phoneOtpHash || !user.phoneOtpExpiry) {
      return res.status(400).json({
        message: "Request a phone OTP first",
      });
    }

    if (Date.now() > user.phoneOtpExpiry.getTime()) {
      user.phoneOtpHash = "";
      user.phoneOtpExpiry = null;
      await user.save();

      return res.status(400).json({
        message: "OTP has expired",
      });
    }

    if ((user.phoneOtpFailedAttempts || 0) >= OTP_MAX_FAILED_ATTEMPTS) {
      return res.status(429).json({
        message: "Too many invalid attempts. Please request a new OTP.",
      });
    }

    const isOtpValid = await bcrypt.compare(otp, user.phoneOtpHash);

    if (!isOtpValid) {
      user.phoneOtpFailedAttempts = (user.phoneOtpFailedAttempts || 0) + 1;
      await user.save();

      return res.status(400).json({
        message: "Invalid OTP",
        attemptsRemaining: Math.max(
          OTP_MAX_FAILED_ATTEMPTS - user.phoneOtpFailedAttempts,
          0,
        ),
      });
    }

    user.isPhoneVerified = true;
    user.phoneOtpHash = "";
    user.phoneOtpExpiry = null;
    user.phoneOtpFailedAttempts = 0;

    await user.save();

    return res.status(200).json({
      message: "Phone number verified successfully",
      user: getPublicUser(user),
    });
  } catch (error) {
    console.error("verifyOtp error", {
      error: error.message,
      stack: error.stack,
      body: req.body,
      authId: req.auth?.id,
    });

    return res.status(500).json({
      message: "Unable to verify phone OTP",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
};
