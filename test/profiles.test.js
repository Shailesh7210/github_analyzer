import request from "supertest";
import app from "../src/app.js";

// Use a real but small GitHub account for testing
const TEST_USERNAME   = "mojombo";
const SECOND_USERNAME = "defunkt";
const INVALID_USERNAME = "-invalid-";
const FAKE_USERNAME    = "this-user-does-not-exist-xyz-999";

describe("Profile Routes", () => {

  // ─────────────────────────────────────────
  // POST /api/analyze/:username
  // ─────────────────────────────────────────
  describe("POST /api/analyze/:username", () => {
    it("should analyze and store a valid GitHub user", async () => {
      const res = await request(app).post(`/api/analyze/${TEST_USERNAME}`);

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("username", TEST_USERNAME);
      expect(res.body.data).toHaveProperty("developer_score");
      expect(res.body.data).toHaveProperty("activity_tier");
      expect(res.body.data).toHaveProperty("total_stars");
      expect(res.body.data).toHaveProperty("repositories");
      expect(res.body.data).toHaveProperty("languages");
      expect(res.body.meta.source).toBe("github");
    });

    it("should return cached result on second call", async () => {
      const res = await request(app).post(`/api/analyze/${TEST_USERNAME}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.meta.source).toBe("cache");
    });

    it("should force refresh when ?refresh=true", async () => {
      const res = await request(app)
        .post(`/api/analyze/${TEST_USERNAME}?refresh=true`);

      expect(res.statusCode).toBe(201);
      expect(res.body.meta.source).toBe("github");
    });

    it("should return 404 for non-existent GitHub user", async () => {
      const res = await request(app).post(`/api/analyze/${FAKE_USERNAME}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.status).toBe("error");
    });

    it("should return 400 for invalid username format", async () => {
      const res = await request(app).post(`/api/analyze/${INVALID_USERNAME}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe("error");
    });

    it("should analyze a second user for compare tests", async () => {
      const res = await request(app).post(`/api/analyze/${SECOND_USERNAME}`);

      expect([200, 201]).toContain(res.statusCode);
      expect(res.body.data).toHaveProperty("username", SECOND_USERNAME);
    });
  });

  // ─────────────────────────────────────────
  // GET /api/profiles
  // ─────────────────────────────────────────
  describe("GET /api/profiles", () => {
    it("should return list of profiles", async () => {
      const res = await request(app).get("/api/profiles");

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("success");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty("total");
      expect(res.body.meta).toHaveProperty("page");
      expect(res.body.meta).toHaveProperty("total_pages");
    });

    it("should support pagination", async () => {
      const res = await request(app).get("/api/profiles?page=1&limit=1");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
      expect(res.body.meta.limit).toBe(1);
    });

    it("should support sorting by developer_score", async () => {
      const res = await request(app)
        .get("/api/profiles?sort=developer_score&order=DESC");

      expect(res.statusCode).toBe(200);
      const scores = res.body.data.map((p) => p.developer_score);
      const sorted = [...scores].sort((a, b) => b - a);
      expect(scores).toEqual(sorted);
    });

    it("should support filtering by language", async () => {
      const res = await request(app).get("/api/profiles?lang=Ruby");

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─────────────────────────────────────────
  // GET /api/profiles/:username
  // ─────────────────────────────────────────
  describe("GET /api/profiles/:username", () => {
    it("should return full profile for existing user", async () => {
      const res = await request(app).get(`/api/profiles/${TEST_USERNAME}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("username", TEST_USERNAME);
      expect(res.body.data).toHaveProperty("repositories");
      expect(res.body.data).toHaveProperty("languages");
      expect(res.body.data).toHaveProperty("developer_score");
      expect(res.body.data).toHaveProperty("last_analyzed");
    });

    it("should return 404 for non-analyzed user", async () => {
      const res = await request(app).get(`/api/profiles/${FAKE_USERNAME}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.status).toBe("error");
    });

    it("should return 400 for invalid username format", async () => {
      const res = await request(app).get(`/api/profiles/${INVALID_USERNAME}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe("error");
    });
  });

  // ─────────────────────────────────────────
  // GET /api/profiles/:username/refresh
  // ─────────────────────────────────────────
  describe("GET /api/profiles/:username/refresh", () => {
    it("should refresh an existing profile", async () => {
      const res = await request(app).get(`/api/profiles/${TEST_USERNAME}/refresh`);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.meta.source).toBe("github");
    });

    it("should return 404 for non-analyzed user", async () => {
      const res = await request(app).get(`/api/profiles/${FAKE_USERNAME}/refresh`);

      expect(res.statusCode).toBe(404);
      expect(res.body.status).toBe("error");
    });
  });

  // ─────────────────────────────────────────
  // GET /api/profiles/:username/compare
  // ─────────────────────────────────────────
  describe("GET /api/profiles/:username/compare", () => {
    it("should compare two analyzed profiles", async () => {
      const res = await request(app)
        .get(`/api/profiles/${TEST_USERNAME}/compare?with=${SECOND_USERNAME}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data.profiles).toHaveLength(2);
      expect(res.body.data).toHaveProperty("winner");
      expect(res.body.data.winner).toHaveProperty("developer_score");
      expect(res.body.data.winner).toHaveProperty("followers");
      expect(res.body.data.winner).toHaveProperty("total_stars");
    });

    it("should return 400 if 'with' param is missing", async () => {
      const res = await request(app)
        .get(`/api/profiles/${TEST_USERNAME}/compare`);

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe("error");
    });

    it("should return 404 if second profile not analyzed", async () => {
      const res = await request(app)
        .get(`/api/profiles/${TEST_USERNAME}/compare?with=${FAKE_USERNAME}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.status).toBe("error");
    });
  });

  // ─────────────────────────────────────────
  // DELETE /api/profiles/:username
  // Run last — deletes test data
  // ─────────────────────────────────────────
  describe("DELETE /api/profiles/:username", () => {
    it("should delete an existing profile", async () => {
      const res = await request(app).delete(`/api/profiles/${SECOND_USERNAME}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("success");
    });

    it("should return 404 when deleting non-existent profile", async () => {
      const res = await request(app).delete(`/api/profiles/${FAKE_USERNAME}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.status).toBe("error");
    });

    it("should return 400 for invalid username on delete", async () => {
      const res = await request(app).delete(`/api/profiles/${INVALID_USERNAME}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe("error");
    });
  });
});