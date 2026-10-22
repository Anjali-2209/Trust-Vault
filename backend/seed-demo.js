
require("dotenv").config();

const argon2 = require("argon2");
const pool = require("./db");

const accounts = [
  {
    name: "Demo Admin",
    email: "admin@trustvault.demo",
    role: "admin",
    passwordEnv: "DEMO_ADMIN_PASSWORD"
  },
  {
    name: "Demo Owner",
    email: "owner@trustvault.demo",
    role: "owner",
    passwordEnv: "DEMO_OWNER_PASSWORD"
  },
  {
    name: "Demo Viewer",
    email: "viewer@trustvault.demo",
    role: "viewer",
    passwordEnv: "DEMO_VIEWER_PASSWORD"
  }
];

async function seedAccounts() {
  try {
    for (const account of accounts) {
      const password = process.env[account.passwordEnv];

      if (
        !password ||
        Buffer.byteLength(password, "utf8") < 12 ||
        Buffer.byteLength(password, "utf8") > 128
      ) {
        throw new Error(
          `${account.passwordEnv} must contain a password of 12-128 bytes`
        );
      }

      const passwordHash = await argon2.hash(password);

      await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email)
         DO UPDATE SET
           name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role`,
        [
          account.name,
          account.email,
          passwordHash,
          account.role
        ]
      );

      console.log(
        `Demo ${account.role} account configured: ${account.email}`
      );
    }

    console.log("Demo accounts created successfully");
  } catch (error) {
    console.error("Demo setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedAccounts();
