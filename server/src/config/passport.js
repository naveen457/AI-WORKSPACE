const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const User = require("../models/User.js");

const SERVER_URL = (process.env.SERVER_URL || "http://localhost:5000").replace(
  /\/+$/,
  "",
);
const googleClientID = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const githubClientID = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Google Strategy
if (googleClientID && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientID,
        clientSecret: googleClientSecret,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          `${SERVER_URL}/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value.toLowerCase();
          const displayNameParts = (profile.displayName || "")
            .trim()
            .split(/\s+/);
          const firstName =
            profile.name?.givenName || displayNameParts[0] || "";
          const lastName =
            profile.name?.familyName ||
            displayNameParts.slice(1).join(" ") ||
            "";

          let user = await User.findOne({ email });

          if (user) {
            return done(null, {
              ...user.toObject(),
              isNewUser: false,
              provider: "google",
            });
          }

          return done(null, {
            isNewUser: true,
            provider: "google",
            email,
            firstName,
            lastName,
            googleId: profile.id,
          });
        } catch (error) {
          done(error);
        }
      },
    ),
  );
} else {
  console.warn("Google OAuth is not configured; skipping Google strategy.");
}

// GitHub Strategy
if (githubClientID && githubClientSecret) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: githubClientID,
        clientSecret: githubClientSecret,
        callbackURL:
          process.env.GITHUB_CALLBACK_URL ||
          `${SERVER_URL}/auth/github/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value.toLowerCase();
          const firstName = profile.displayName.split(" ")[0] || "GitHub";
          const lastName = profile.displayName.split(" ")[1] || "";

          let user = await User.findOne({ email });

          if (user) {
            return done(null, {
              ...user.toObject(),
              isNewUser: false,
              provider: "github",
            });
          }

          return done(null, {
            isNewUser: true,
            provider: "github",
            email,
            firstName,
            lastName,
            githubId: profile.id,
          });
        } catch (error) {
          done(error);
        }
      },
    ),
  );
} else {
  console.warn("GitHub OAuth is not configured; skipping GitHub strategy.");
}

module.exports = passport;
