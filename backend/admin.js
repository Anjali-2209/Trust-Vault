
const express = require("express");
const pool = require("./db");

const router = express.Router();

// Every admin route requires an authenticated administrator.
// Check the database role rather than trusting the browser.
router.use(async (req, res, next) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        error: "Login required"
      });
    }

    const result = await pool.query(
      "SELECT id, role FROM users WHERE id = $1",
      [req.session.userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        error: "Login required"
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        error: "Admin access required"
      });
    }

    next();
  } catch (error) {
    console.error("Admin authorization error:", error);
    res.status(500).json({
      error: "Unable to verify admin access"
    });
  }
});

// GET /api/admin/audit-logs
// Read-only, paginated activity history.
router.get("/audit-logs", async (req, res) => {
  try {
    const page = Math.max(
      1,
      Math.min(100000, parseInt(req.query.page, 10) || 1)
    );

    const limit = 25;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT
         a.id,
         a.actor_id,
         u.name AS actor_name,
         u.email AS actor_email,
         a.document_id,
         a.action,
         a.outcome,
         a.details,
         a.occurred_at
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       ORDER BY a.occurred_at DESC, a.id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query(
      "SELECT COUNT(*)::int AS total FROM audit_logs"
    );

    return res.json({
      logs: result.rows,
      page,
      limit,
      total: countResult.rows[0].total
    });
  } catch (error) {
    console.error("Audit log error:", error);

    return res.status(500).json({
      error: "Unable to load audit logs"
    });
  }
});

module.exports = router;
