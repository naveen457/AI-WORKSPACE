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
const CLIENT_URL = process.env.CLIENT_URL || "https://astrix-six.vercel.app";
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "dev_jwt_secret_key");

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production");
}

function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

function createOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function normalizeIdentifier(value) {
  return value?.trim().toLowerCase();
}

function createAuthToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

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

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!token) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired session",
    });
  }
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
      user: getPublicUser(user),
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

    const token = createAuthToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: getPublicUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to login",
    });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user: getPublicUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to load profile",
    });
  }
});

router.put("/profile", requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, profilePhoto } = req.body;

    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({
        message: "First name and last name are required",
      });
    }

    if (
      profilePhoto &&
      (
        typeof profilePhoto !== "string" ||
        !profilePhoto.startsWith("data:image/") ||
        profilePhoto.length > 1500000
      )
    ) {
      return res.status(400).json({
        message: "Profile photo must be an image under 1.5 MB",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.auth.id,
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        profilePhoto: profilePhoto || "",
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: getPublicUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to update profile",
    });
  }
});

router.put("/personal-details", requireAuth, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phoneNumber,
      address,
    } = req.body;

    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({
        message: "First name and last name are required",
      });
    }

    const currentUser = await User.findById(req.auth.id);

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const normalizedPhone = phoneNumber?.trim() || "";
    const user = await User.findByIdAndUpdate(
      req.auth.id,
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: currentUser.email,
        dateOfBirth: dateOfBirth?.trim() || "",
        gender: gender?.trim() || "",
        phoneNumber: normalizedPhone,
        isPhoneVerified:
          normalizedPhone && normalizedPhone === currentUser.phoneNumber
            ? currentUser.isPhoneVerified
            : false,
        address: address?.trim() || "",
      },
      {
        new: true,
        runValidators: true,
      },
    );

    return res.status(200).json({
      message: "Personal details updated successfully",
      token: createAuthToken(user),
      user: getPublicUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to update personal details",
    });
  }
});

router.put("/profile-photo", requireAuth, async (req, res) => {
  try {
    const { profilePhoto } = req.body;

    if (
      profilePhoto &&
      (
        typeof profilePhoto !== "string" ||
        !profilePhoto.startsWith("data:image/") ||
        profilePhoto.length > 1500000
      )
    ) {
      return res.status(400).json({
        message: "Profile photo must be an image under 1.5 MB",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.auth.id,
      {
        profilePhoto: profilePhoto || "",
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Profile photo updated successfully",
      user: getPublicUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to update profile photo",
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
        JWT_SECRET,
        { expiresIn: "1h" },
      );

      return res.redirect(
        `${CLIENT_URL}/oauth-complete?token=${token}&provider=google`,
      );
    }

    // Existing user - generate JWT and redirect to dashboard
    const token = createAuthToken(user);

    res.redirect(
      `${CLIENT_URL}/auth?token=${token}`,
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
        JWT_SECRET,
        { expiresIn: "1h" },
      );

      return res.redirect(
        `${CLIENT_URL}/oauth-complete?token=${token}&provider=github`,
      );
    }

    const token = createAuthToken(user);

    res.redirect(
      `${CLIENT_URL}/auth?token=${token}`,
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
      decoded = jwt.verify(token, JWT_SECRET);
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
    const authToken = createAuthToken(user);

    return res.status(201).json({
      message: "Account created successfully",
      token: authToken,
      user: getPublicUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to complete OAuth signup",
    });
  }
});

module.exports = router;
