const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");
const passport = require("passport");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
const connectDB = require("./config/db.js");
const authRoutes = require("./routes/auth.routes.js");
const phoneRoutes = require("./routes/phone.routes.js");
const chatRoutes = require("./routes/chat.routes.js");

require("./config/passport.js");

if (process.env.MONGO_URI) {
  connectDB();
} else {
  console.warn("MONGO_URI is not set; continuing without database connection.");
}

const app = express();
const CLIENT_URL = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((url) => url.trim()).filter(Boolean)
  : "http://localhost:5173";
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "dev_session_secret");

if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required in production");
}

app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = Array.isArray(CLIENT_URL)
        ? CLIENT_URL
        : [CLIENT_URL];

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(
          `CORS policy does not allow access from origin: ${origin}`
        )
      );
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Session middleware
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", authRoutes);
app.use("/auth/phone", phoneRoutes);
app.use("/chat", chatRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "ASTRIX Backend Running",
  });
});

module.exports = app;
