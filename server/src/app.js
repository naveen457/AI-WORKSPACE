const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const passport = require("passport");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
const { getJwtSecret } = require("./utils/token.js");
// Validate required JWT secret at application startup
getJwtSecret();

const connectDB = require("./config/db.js");
const authRoutes = require("./routes/auth.routes.js");
const phoneRoutes = require("./routes/phone.routes.js");
const chatRoutes = require("./routes/chat.routes.js");
const { startKeepAlive } = require("./services/keepAlive.service.js");

require("./config/passport.js");

if (process.env.MONGO_URI) {
  connectDB();
} else {
  console.warn("MONGO_URI is not set; continuing without database connection.");
}

// Start automatic keep-alive pinger for Render services
startKeepAlive();

const app = express();
const CLIENT_URL = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((url) => url.trim()).filter(Boolean)
  : "http://localhost:5173";

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

app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Initialize Passport (sessionless)
app.use(passport.initialize());

app.use("/auth", authRoutes);
app.use("/auth/phone", phoneRoutes);
app.use("/chat", chatRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "ASTRIX Backend Running",
  });
});

module.exports = app;
