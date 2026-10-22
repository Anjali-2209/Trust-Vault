
const express = require("express");
const argon2 = require("argon2");
const pool = require("./db");

const router = express.Router();

// Register a new viewer account.
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100 ||
      email.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      Buffer.byteLength(password, "utf8") < 12 ||
      Buffer.byteLength(password, "utf8") > 128
    ) {
      return res.status(400).json({
        error: "Enter a valid name, email and password of 12-128 bytes"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await argon2.hash(password);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'viewer')
       RETURNING id, name, email, role`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    return res.status(201).json({
      message: "Registration successful",
      user: result.rows[0]
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Email already registered"
      });
    }

    console.error("Registration error:", error);
    return res.status(500).json({
      error: "Registration failed"
    });
  }
});

// Login with email and password.
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.length > 255 ||
      Buffer.byteLength(password, "utf8") > 128
    ) {
      return res.status(400).json({
        error: "Invalid credentials"
      });
    }

    const result = await pool.query(
      `SELECT id, name, email, role, password_hash
       FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (!user || !(await argon2.verify(user.password_hash, password))) {
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }

    // Replace the session ID when a user logs in.
    req.session.regenerate((error) => {
      if (error) {
        console.error("Session error:", error);
        return res.status(500).json({ error: "Login failed" });
      }

      req.session.userId = user.id;

      req.session.save((saveError) => {
        if (saveError) {
          console.error("Session save error:", saveError);
          return res.status(500).json({ error: "Login failed" });
        }

        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      });
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});

// Return the currently logged-in user.
router.get("/me", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = $1",
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    console.error("User lookup error:", error);
    return res.status(500).json({ error: "Request failed" });
  }
});

// End the current session.
router.post("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ error: "Logout failed" });
    }

    res.clearCookie("trustvault.sid", { path: "/" });
    return res.json({ message: "Logged out successfully" });
  });
});

module.exports = router;

