
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const pool = require("./db");
const authRoutes = require("./auth");
const documentRoutes = require("./documents");
const adminRoutes = require("./admin");

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required");
}

if (isProduction && !process.env.APP_ORIGIN) {
  throw new Error("APP_ORIGIN is required in production");
}

app.disable("x-powered-by");

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(helmet());
app.use(express.json({ limit: "20kb" }));

// Check the origin of requests that change data.
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const origin = req.get("Origin");

  const allowedOrigin = isProduction
    ? process.env.APP_ORIGIN
    : "http://localhost:5173";

  if (origin && origin !== allowedOrigin) {
    return res.status(403).json({
      error: "Request origin not allowed"
    });
  }

  next();
});

// PostgreSQL-backed login sessions.
app.use(
  session({
    name: "trustvault.sid",
    store: new PgSession({
      pool,
      tableName: "user_sessions"
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 60 * 60 * 1000
    }
  })
);

// Limit repeated login attempts.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please try again later."
  }
});

// Limit account registrations.
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many registrations. Please try again later."
  }
});

// API routes.
app.get("/api/health", (req, res) => {
  res.json({
    message: "TrustVault backend is running",
    status: "OK"
  });
});

app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/register", registrationLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/admin", adminRoutes);

// Serve the built React frontend in production.
const frontendDist = path.join(__dirname, "../frontend/dist");

if (isProduction) {
  if (!fs.existsSync(frontendDist)) {
    throw new Error(
      "Frontend build not found. Run npm run build in frontend."
    );
  }

  app.use(express.static(frontendDist));

  // React single-page application fallback.
  app.get("/{*path}", (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// Start only when running directly.
// Security tests can import the app without starting a server.
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TrustVault server running on port ${PORT}`);
  });
}

module.exports = app;
