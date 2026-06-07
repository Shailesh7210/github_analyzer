import request from "supertest";
import app from "../src/app.js";

describe("Health Routes", () => {
  // GET /health
  describe("GET /health", () => {
    it("should return 200 with server status", async () => {
      const res = await request(app).get("/health");

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.message).toContain("running");
      expect(res.body).toHaveProperty("timestamp");
      expect(res.body.services).toHaveProperty("database");
    });
  });

  // GET /health/github-rate
  describe("GET /health/github-rate", () => {
    it("should return GitHub rate limit info", async () => {
      const res = await request(app).get("/health/github-rate");

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("limit");
      expect(res.body.data).toHaveProperty("remaining");
    });
  });

  // GET /unknown-route
  describe("GET /unknown-route", () => {
    it("should return 404 for unknown routes", async () => {
      const res = await request(app).get("/unknown-route");

      expect(res.statusCode).toBe(404);
      expect(res.body.status).toBe("error");
    });
  });
});