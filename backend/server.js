
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);

const pool = require("./db");
const authRoutes = require("./auth");
const documentRoutes = require("./documents");
const adminRoutes = require("./admin");
const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required");
}

app.disable("x-powered-by");

app.use(express.json({ limit: "20kb" }));

// Store login sessions in PostgreSQL.
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
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000
    }
  })
);

// Check whether the backend is running.
app.get("/api/health", (req, res) => {
  res.json({
    message: "TrustVault backend is running",
    status: "OK"
  });
});

// Authentication routes.
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/admin", adminRoutes);
if(require.main=== module){
app.listen(PORT, () => {
  console.log(`TrustVault server running on port ${PORT}`);
});
}
module.exports=app;
