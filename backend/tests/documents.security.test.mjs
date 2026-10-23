
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";

import app from "../server.js";
import pool from "../db.js";

const owner = request.agent(app);
const viewer = request.agent(app);
const stranger = request.agent(app);

let documentId;

async function login(agent, email, password) {
  const response = await agent
    .post("/api/auth/login")
    .send({ email, password });

  expect(response.status).toBe(200);
}

describe("TrustVault document authorization", () => {
  beforeAll(async () => {
    const required = [
      "DEMO_OWNER_PASSWORD",
      "DEMO_VIEWER_PASSWORD",
      "DEMO_ADMIN_PASSWORD"
    ];

    for (const key of required) {
      if (!process.env[key]) {
        throw new Error(`Missing ${key} in backend/.env`);
      }
    }

    await login(
      owner,
      "owner@trustvault.demo",
      process.env.DEMO_OWNER_PASSWORD
    );

    await login(
      viewer,
      "viewer@trustvault.demo",
      process.env.DEMO_VIEWER_PASSWORD
    );

    await login(
      stranger,
      "admin@trustvault.demo",
      process.env.DEMO_ADMIN_PASSWORD
    );

    const upload = await owner
      .post("/api/documents/upload")
      .field("category", "security-test")
      .attach(
        "file",
        Buffer.from("Temporary TrustVault authorization test."),
        {
          filename: "security-test.txt",
          contentType: "text/plain"
        }
      );

    expect(upload.status).toBe(201);
    documentId = upload.body.document.id;
  });

  afterAll(async () => {
    if (documentId) {
      await owner.delete(`/api/documents/${documentId}`);
    }

    await pool.end();
  });

  it("rejects unauthenticated downloads", async () => {
    const response = await request(app)
      .get(`/api/documents/${documentId}/download`);

    expect(response.status).toBe(401);
  });

  it("blocks a viewer without permission", async () => {
    const response = await viewer
      .get(`/api/documents/${documentId}/download`);

    expect(response.status).toBe(403);
  });

  it("blocks an unrelated admin from downloading", async () => {
    const response = await stranger
      .get(`/api/documents/${documentId}/download`);

    expect(response.status).toBe(403);
  });

  it("blocks a viewer from editing without permission", async () => {
    const response = await viewer
      .put(`/api/documents/${documentId}`)
      .send({ category: "unauthorized-change" });

    expect(response.status).toBe(403);
  });

  it("blocks a viewer from deleting someone else's document", async () => {
    const response = await viewer
      .delete(`/api/documents/${documentId}`);

    expect(response.status).toBe(403);
  });

  it("blocks a viewer from granting access", async () => {
    const response = await viewer
      .post(`/api/documents/${documentId}/grant`)
      .send({
        email: "admin@trustvault.demo",
        permission: "read"
      });

    expect(response.status).toBe(403);
  });

  it("allows the owner to grant read access", async () => {
    const response = await owner
      .post(`/api/documents/${documentId}/grant`)
      .send({
        email: "viewer@trustvault.demo",
        permission: "read"
      });

    expect(response.status).toBe(200);
  });

  it("allows a viewer to download after a grant", async () => {
    const response = await viewer
      .get(`/api/documents/${documentId}/download`);

    expect(response.status).toBe(200);
    expect(response.body.toString()).toContain(
      "Temporary TrustVault authorization test."
    );
  });

  it("does not allow read permission to edit", async () => {
    const response = await viewer
      .put(`/api/documents/${documentId}`)
      .send({ category: "unauthorized-change" });

    expect(response.status).toBe(403);
  });

  it("allows the owner to revoke access", async () => {
    const response = await owner
      .post(`/api/documents/${documentId}/revoke`)
      .send({ email: "viewer@trustvault.demo" });

    expect(response.status).toBe(200);
  });

  it("blocks downloads immediately after revocation", async () => {
    const response = await viewer
      .get(`/api/documents/${documentId}/download`);

    expect(response.status).toBe(403);
  });

  it("blocks viewers from reading admin audit logs", async () => {
    const response = await viewer
      .get("/api/admin/audit-logs");

    expect(response.status).toBe(403);
  });

  it("blocks owners from reading admin audit logs", async () => {
    const response = await owner
      .get("/api/admin/audit-logs");

    expect(response.status).toBe(403);
  });

  it("allows administrators to read audit logs", async () => {
    const response = await stranger
      .get("/api/admin/audit-logs");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.logs)).toBe(true);
  });
});
