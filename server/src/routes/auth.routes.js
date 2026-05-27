const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const passport = require("passport");

const EmailOtp = require("../models/EmailOtp.js");
const PasswordResetOtp = require("../models/PasswordResetOtp.js");
const User = require("../models/User.js");
const { sendOtpEmail } = require("../utils/mailer.js");

const router = express.Router();

const BCRYPT_SALT_ROUNDS = 12;
const OTP_EXPIRY_MS = 10 * 60 * 1000;

function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

function createOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function normalizeIdentifier(value) {
  return value?.trim().toLowerCase();
}

function isValidPassword(password) {
  return (
    password &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

router.post("/request-email-otp", async (req, res) => {
  try {
    const { firstName, lastName, email, password, acceptedTerms } = req.body;

    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({
        message: "First name and last name are required",
      });
    }

    if (!email?.trim() || !isValidEmail(email)) {
      return res.status(400).json({
        message: "A valid email address is required",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, and number",
      });
    }

    if (!acceptedTerms) {
      return res.status(400).json({
        message: "Please accept the terms and conditions",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "An account already exists with this email",
      });
    }

    const otp = createOtp();
    const [passwordHash, otpHash] = await Promise.all([
      bcrypt.hash(password, BCRYPT_SALT_ROUNDS),
      bcrypt.hash(otp, BCRYPT_SALT_ROUNDS),
    ]);

    await EmailOtp.findOneAndUpdate(
      { email: normalizedEmail },
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        passwordHash,
        otpHash,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    try {
      await sendOtpEmail({
        to: normalizedEmail,
        otp,
      });
    } catch (error) {
      await EmailOtp.deleteOne({ email: normalizedEmail });

      return res.status(500).json({
        message:
          "Unable to send OTP email. Please check email service configuration.",
      });
    }

    return res.status(200).json({
      message: "OTP sent to email",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to request email OTP",
    });
  }
});

router.post("/verify-email-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    const pendingOtp = await EmailOtp.findOne({ email: normalizedEmail });

    if (!pendingOtp) {
      return res.status(400).json({
        message: "No OTP request found for this email",
      });
    }

    if (Date.now() > pendingOtp.expiresAt.getTime()) {
      await EmailOtp.deleteOne({ email: normalizedEmail });

      return res.status(400).json({
        message: "OTP has expired",
      });
    }

    const isOtpValid = await bcrypt.compare(otp.trim(), pendingOtp.otpHash);

    if (!isOtpValid) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      await EmailOtp.deleteOne({ email: normalizedEmail });

      return res.status(409).json({
        message: "An account already exists with this email",
      });
    }

    const user = await User.create({
      firstName: pendingOtp.firstName,
      lastName: pendingOtp.lastName,
      email: normalizedEmail,
      passwordHash: pendingOtp.passwordHash,
      isEmailVerified: true,
    });

    await EmailOtp.deleteOne({ email: normalizedEmail });

    return res.status(201).json({
      message: "Email verified successfully",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to verify email OTP",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeIdentifier(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to login",
    });
  }
});

router.post("/request-password-reset-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeIdentifier(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        message: "No account found with this email",
      });
    }

    const otp = createOtp();
    const otpHash = await bcrypt.hash(otp, BCRYPT_SALT_ROUNDS);

    await PasswordResetOtp.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        otpHash,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    try {
      await sendOtpEmail({
        to: normalizedEmail,
        otp,
        purpose: "password reset",
      });
    } catch (error) {
      await PasswordResetOtp.deleteOne({ email: normalizedEmail });

      return res.status(500).json({
        message:
          "Unable to send password reset OTP. Please check email service configuration.",
      });
    }

    return res.status(200).json({
      message: "Password reset OTP sent to email",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to request password reset OTP",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    const normalizedEmail = normalizeIdentifier(email);

    if (!normalizedEmail || !otp || !password) {
      return res.status(400).json({
        message: "Email, OTP, and new password are required",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, and number",
      });
    }

    const pendingOtp = await PasswordResetOtp.findOne({
      email: normalizedEmail,
    });

    if (!pendingOtp) {
      return res.status(400).json({
        message: "No password reset request found for this email",
      });
    }

    if (Date.now() > pendingOtp.expiresAt.getTime()) {
      await PasswordResetOtp.deleteOne({ email: normalizedEmail });

      return res.status(400).json({
        message: "OTP has expired",
      });
    }

    const isOtpValid = await bcrypt.compare(otp.trim(), pendingOtp.otpHash);

    if (!isOtpValid) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const user = await User.findOneAndUpdate(
      { email: pendingOtp.email },
      { passwordHash },
      { new: true },
    );

    if (!user) {
      await PasswordResetOtp.deleteOne({ email: normalizedEmail });

      return res.status(404).json({
        message: "No account found with this email",
      });
    }

    await PasswordResetOtp.deleteOne({ email: normalizedEmail });

    return res.status(200).json({
      message: "Password reset successful",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to reset password",
    });
  }
});

// OAuth Routes
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const user = req.user;

    if (user.isNewUser) {
      // New user - redirect to frontend to confirm profile details
      const token = jwt.sign(
        {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          provider: user.provider,
          googleId: user.googleId,
          isNewUser: true,
        },
        process.env.JWT_SECRET || "your_secret_key",
        { expiresIn: "1h" },
      );

      return res.redirect(
        `${process.env.CLIENT_URL || "http://localhost:5173"}/oauth-complete?token=${token}&provider=google`,
      );
    }

    // Existing user - generate JWT and redirect to dashboard
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "7d" },
    );

    res.redirect(
      `${process.env.CLIENT_URL || "http://localhost:5173"}/auth?token=${token}`,
    );
  },
);

router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
    session: false,
  }),
);

router.get(
  "/github/callback",
  passport.authenticate("github", { session: false }),
  (req, res) => {
    const user = req.user;

    if (user.isNewUser) {
      const token = jwt.sign(
        {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          provider: user.provider,
          githubId: user.githubId,
          isNewUser: true,
        },
        process.env.JWT_SECRET || "your_secret_key",
        { expiresIn: "1h" },
      );

      return res.redirect(
        `${process.env.CLIENT_URL || "http://localhost:5173"}/oauth-complete?token=${token}&provider=github`,
      );
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "7d" },
    );

    res.redirect(
      `${process.env.CLIENT_URL || "http://localhost:5173"}/auth?token=${token}`,
    );
  },
);

router.get(
  "/apple",
  passport.authenticate("apple", {
    scope: ["email", "name"],
    session: false,
  }),
);

router.get(
  "/apple/callback",
  passport.authenticate("apple", { session: false }),
  (req, res) => {
    const user = req.user;

    if (user.isNewUser) {
      const token = jwt.sign(
        {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          provider: user.provider,
          appleId: user.appleId,
          isNewUser: true,
        },
        process.env.JWT_SECRET || "your_secret_key",
        { expiresIn: "1h" },
      );

      return res.redirect(
        `${process.env.CLIENT_URL || "http://localhost:5173"}/oauth-complete?token=${token}&provider=apple`,
      );
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "7d" },
    );

    res.redirect(
      `${process.env.CLIENT_URL || "http://localhost:5173"}/auth?token=${token}`,
    );
  },
);

// Complete OAuth signup after the user confirms their name and creates a password
router.post("/oauth-complete-signup", async (req, res) => {
  try {
    const { token, firstName, lastName, password } = req.body;

    if (!token || !firstName?.trim() || !lastName?.trim() || !password) {
      return res.status(400).json({
        message: "Token, full name, and password are required",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, and number",
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your_secret_key");
    } catch (error) {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    if (!decoded.isNewUser) {
      return res.status(400).json({
        message: "This account already exists",
      });
    }

    const normalizedEmail = decoded.email?.trim().toLowerCase();

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        message: "A valid OAuth email is required",
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "An account already exists with this email",
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Create user
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      passwordHash,
      isEmailVerified: true,
    });

    // Generate JWT
    const authToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "7d" },
    );

    return res.status(201).json({
      message: "Account created successfully",
      token: authToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to complete OAuth signup",
    });
  }
});

module.exports = router;
