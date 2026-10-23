
const express = require("express");
const multer = require("multer");
const pool = require("./db");

const router = express.Router();

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter(req, file, callback) {
    const allowed = [
      "application/pdf",
      "text/plain",
      "image/png",
      "image/jpeg"
    ];

    if (!allowed.includes(file.mimetype)) {
      return callback(new Error("Unsupported file type"));
    }

    callback(null, true);
  }
});

// Every document route requires login.
router.use((req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Login required" });
  }
  next();
});

async function currentUser(req) {
  const result = await pool.query(
    "SELECT id, role FROM users WHERE id = $1",
    [req.session.userId]
  );
  return result.rows[0];
}

async function audit(actorId, documentId, action, outcome, details = {}) {
  await pool.query(
    `INSERT INTO audit_logs
     (actor_id, document_id, action, outcome, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [actorId, documentId, action, outcome, JSON.stringify(details)]
  );
}

function validId(value) {
  return /^[1-9]\d*$/.test(String(value));
}

async function documentAccess(documentId, userId) {
  const result = await pool.query(
    `SELECT d.id, d.owner_id, d.filename, d.category,
            d.mime_type, d.file_size, d.created_at,
            p.permission
     FROM documents d
     LEFT JOIN document_permissions p
       ON p.document_id = d.id AND p.user_id = $2
     WHERE d.id = $1`,
    [documentId, userId]
  );

  return result.rows[0];
}

function canRead(document, userId) {
  return (
    String(document.owner_id) === String(userId) ||
    document.permission === "read" ||
    document.permission === "edit"
  );
}

function canEdit(document, userId) {
  return (
    String(document.owner_id) === String(userId) ||
    document.permission === "edit"
  );
}

function safeFilename(name) {
  return name
    .replace(/[\/\\]/g, "_")
    .replace(/[\r\n"]/g, "_")
    .slice(0, 255);
}

function detectFileType(buffer) {
  if (
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString() === "%PDF-"
  ) {
    return "application/pdf";
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 3 &&
    buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
  ) {
    return "image/jpeg";
  }

  const text = buffer.toString("utf8");
  if (
    !text.includes("\uFFFD") &&
    !text.includes("\u0000")
  ) {
    return "text/plain";
  }

  return null;
}

// POST /api/documents/upload
router.post("/upload", (req, res) => {
  upload.single("file")(req, res, async (uploadError) => {
    try {
      const user = await currentUser(req);

      if (!user) {
        return res.status(401).json({ error: "Login required" });
      }

      if (user.role !== "owner") {
        await audit(user.id, null, "upload", "denied", {
          reason: "Only owners can upload"
        });

        return res.status(403).json({
          error: "Only owners can upload documents"
        });
      }

      if (uploadError) {
        await audit(user.id, null, "upload", "denied", {
          reason: uploadError.message
        });

        return res.status(400).json({
          error: uploadError.message
        });
      }

      if (!req.file || !req.file.size) {
        return res.status(400).json({
          error: "Select a non-empty file"
        });
      }

      const detectedType = detectFileType(req.file.buffer);

      if (!detectedType || detectedType !== req.file.mimetype) {
        await audit(user.id, null, "upload", "denied", {
          reason: "File content does not match its type"
        });

        return res.status(400).json({
          error: "File content does not match its type"
        });
      }

      const filename = safeFilename(req.file.originalname);
      const category =
        typeof req.body.category === "string"
          ? req.body.category.trim().slice(0, 100) || "general"
          : "general";

      const result = await pool.query(
        `INSERT INTO documents
         (owner_id, filename, category, mime_type, file_data, file_size)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, filename, category, file_size, created_at`,
        [
          user.id,
          filename,
          category,
          detectedType,
          req.file.buffer,
          req.file.size
        ]
      );

      const document = result.rows[0];

      await audit(user.id, document.id, "upload", "allowed");

      return res.status(201).json({
        message: "Document uploaded",
        document
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ error: "Upload failed" });
    }
  });
});

// GET /api/documents
// Search only documents the current user can access.
router.get("/", async (req, res) => {
  try {
    const user = await currentUser(req);

    if (!user) {
      return res.status(401).json({ error: "Login required" });
    }

    const search =
      typeof req.query.search === "string"
        ? req.query.search.slice(0, 100)
        : "";

    const category =
      typeof req.query.category === "string"
        ? req.query.category.slice(0, 100)
        : "";

    const owner =
      typeof req.query.owner === "string"
        ? req.query.owner.slice(0, 100)
        : "";

    const from =
      typeof req.query.from === "string"
        ? req.query.from
        : "";

    const to =
      typeof req.query.to === "string"
        ? req.query.to
        : "";

    const result = await pool.query(
      `SELECT d.id, d.filename, d.category, d.file_size,
              d.mime_type, d.created_at, d.updated_at,
              u.name AS owner_name, u.email AS owner_email,
              CASE
                WHEN d.owner_id = $1 THEN 'owner'
                ELSE p.permission
              END AS access
       FROM documents d
       JOIN users u ON u.id = d.owner_id
       LEFT JOIN document_permissions p
         ON p.document_id = d.id AND p.user_id = $1
       WHERE (d.owner_id = $1 OR p.permission IN ('read', 'edit'))
         AND d.filename ILIKE '%' || $2 || '%'
         AND ($3 = '' OR d.category = $3)
         AND ($4 = '' OR u.name ILIKE '%' || $4 || '%'
                       OR u.email ILIKE '%' || $4 || '%')
         AND ($5 = '' OR d.created_at >= $5::timestamptz)
         AND ($6 = '' OR d.created_at <= $6::timestamptz)
       ORDER BY d.created_at DESC
       LIMIT 100`,
      [user.id, search, category, owner, from, to]
    );

    return res.json({ documents: result.rows });
  } catch (error) {
    console.error("Document list error:", error);
    return res.status(400).json({ error: "Unable to search documents" });
  }
});

// GET /api/documents/:id
router.get("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const user = await currentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Login required" });
    }

    const document = await documentAccess(req.params.id, user.id);

    if (!document || !canRead(document, user.id)) {
      await audit(user.id, req.params.id, "read", "denied");
      return res.status(403).json({ error: "Access denied" });
    }

    await audit(user.id, document.id, "read", "allowed");

    return res.json({ document });
  } catch (error) {
    console.error("Read error:", error);
    return res.status(500).json({ error: "Request failed" });
  }
});

// GET /api/documents/:id/download

// GET /api/documents/:id/download
router.get("/:id/download", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        error: "Invalid document ID"
      });
    }

    const user = await currentUser(req);

    if (!user) {
      return res.status(401).json({
        error: "Login required"
      });
    }

    // Check permission and retrieve file contents in one query.
    // The query only returns data if this user currently has access.
    const result = await pool.query(
      `SELECT
         d.id,
         d.filename,
         d.file_data
       FROM documents d
       WHERE d.id = $1
         AND (
           d.owner_id = $2
           OR EXISTS (
             SELECT 1
             FROM document_permissions p
             WHERE p.document_id = d.id
               AND p.user_id = $2
               AND p.permission IN ('read', 'edit')
           )
         )`,
      [req.params.id, user.id]
    );

    const document = result.rows[0];

    if (!document) {
      await audit(
        user.id,
        req.params.id,
        "download",
        "denied"
      );

      return res.status(403).json({
        error: "Access denied"
      });
    }

    await audit(
      user.id,
      document.id,
      "download",
      "allowed"
    );

    res.setHeader(
      "Content-Type",
      "application/octet-stream"
    );

    res.setHeader(
      "X-Content-Type-Options",
      "nosniff"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFilename(document.filename)}"`
    );

    return res.send(document.file_data);
  } catch (error) {
    console.error("Download error:", error);

    return res.status(500).json({
      error: "Download failed"
    });
  }
});



// PUT /api/documents/:id
// Change category (requires edit permission).
router.put("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const user = await currentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Login required" });
    }

    const document = await documentAccess(req.params.id, user.id);

    if (!document || !canEdit(document, user.id)) {
      await audit(user.id, req.params.id, "edit", "denied");
      return res.status(403).json({ error: "Access denied" });
    }

    const { category } = req.body || {};

    if (
      typeof category !== "string" ||
      !category.trim() ||
      category.length > 100
    ) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const result = await pool.query(
      `UPDATE documents
       SET category = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, filename, category, updated_at`,
      [category.trim(), document.id]
    );

    await audit(user.id, document.id, "edit", "allowed");

    return res.json({
      message: "Document updated",
      document: result.rows[0]
    });
  } catch (error) {
    console.error("Edit error:", error);
    return res.status(500).json({ error: "Edit failed" });
  }
});

// POST /api/documents/:id/grant
router.post("/:id/grant", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const user = await currentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Login required" });
    }

    const document = await documentAccess(req.params.id, user.id);

    if (!document || String(document.owner_id) !== String(user.id)) {
      await audit(user.id, req.params.id, "grant", "denied");
      return res.status(403).json({ error: "Only the owner can grant access" });
    }

    const { email, permission } = req.body || {};

    if (
      typeof email !== "string" ||
      email.length > 255 ||
      !["read", "edit"].includes(permission)
    ) {
      return res.status(400).json({ error: "Invalid grant details" });
    }

    const target = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    if (!target.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const targetId = target.rows[0].id;

    if (String(targetId) === String(user.id)) {
      return res.status(400).json({
        error: "Owner already has full access"
      });
    }

    await pool.query(
      `INSERT INTO document_permissions
       (document_id, user_id, permission, granted_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (document_id, user_id)
       DO UPDATE SET permission = EXCLUDED.permission,
                     granted_by = EXCLUDED.granted_by,
                     granted_at = NOW()`,
      [document.id, targetId, permission, user.id]
    );

    await audit(user.id, document.id, "grant", "allowed", {
      targetUserId: targetId,
      permission
    });

    return res.json({ message: "Permission granted" });
  } catch (error) {
    console.error("Grant error:", error);
    return res.status(500).json({ error: "Grant failed" });
  }
});

// POST /api/documents/:id/revoke
router.post("/:id/revoke", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const user = await currentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Login required" });
    }

    const document = await documentAccess(req.params.id, user.id);

    if (!document || String(document.owner_id) !== String(user.id)) {
      await audit(user.id, req.params.id, "revoke", "denied");
      return res.status(403).json({ error: "Only the owner can revoke access" });
    }

    const { email } = req.body || {};

    if (typeof email !== "string" || email.length > 255) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const result = await pool.query(
      `DELETE FROM document_permissions
       WHERE document_id = $1
         AND user_id = (
           SELECT id FROM users WHERE email = $2
         )
       RETURNING user_id`,
      [document.id, email.trim().toLowerCase()]
    );

    await audit(user.id, document.id, "revoke", "allowed", {
      revokedCount: result.rowCount
    });

    return res.json({ message: "Permission revoked" });
  } catch (error) {
    console.error("Revoke error:", error);
    return res.status(500).json({ error: "Revoke failed" });
  }
});

// DELETE /api/documents/:id
router.delete("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const user = await currentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Login required" });
    }

    const document = await documentAccess(req.params.id, user.id);

    if (!document || String(document.owner_id) !== String(user.id)) {
      await audit(user.id, req.params.id, "delete", "denied");
      return res.status(403).json({ error: "Only the owner can delete" });
    }

    await pool.query(
      "DELETE FROM documents WHERE id = $1 AND owner_id = $2",
      [document.id, user.id]
    );

    await audit(user.id, document.id, "delete", "allowed");

    return res.json({ message: "Document deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;
