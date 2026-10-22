
require("dotenv").config();

const express = require("express");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    message: "TrustVault backend is running",
    status: "OK"
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS time"
    );

    res.json({
      message: "PostgreSQL connected successfully",
      result: result.rows[0]
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(500).json({
      error: "Database connection failed"
    });
  }
});

app.listen(PORT, () => {
  console.log(`TrustVault server running on port ${PORT}`);
});
