const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    dateOfBirth: {
      type: String,
      default: "",
      trim: true,
    },
    gender: {
      type: String,
      default: "",
      trim: true,
    },
    phoneNumber: {
      type: String,
      default: "",
      trim: true,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneOtpHash: {
      type: String,
      default: "",
    },
    phoneOtpExpiry: {
      type: Date,
      default: null,
    },
    phoneOtpResendCount: {
      type: Number,
      default: 0,
    },
    phoneOtpWindowStartAt: {
      type: Date,
      default: null,
    },
    phoneOtpLastSentAt: {
      type: Date,
      default: null,
    },
    phoneOtpFailedAttempts: {
      type: Number,
      default: 0,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: true,
    },
    profilePhoto: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
