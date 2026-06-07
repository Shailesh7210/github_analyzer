import request from "supertest";
import app from "../src/app.js";

describe("Stats Routes", () => {

  // ─────────────────────────────────────────
  // GET /api/stats
  // ─────────────────────────────────────────
  describe("GET /api/stats", () => {
    it("should return platform overview stats", async () => {
      const res = await request(app).get("/api/stats");

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("overview");
      expect(res.body.data).toHaveProperty("top_languages");
      expect(res.body.data).toHaveProperty("activity_breakdown");
      expect(res.body.data).toHaveProperty("top_developers");
      expect(res.body.data).toHaveProperty("most_followed");
      expect(res.body.data).toHaveProperty("most_starred");
      expect(res.body.data).toHaveProperty("recently_analyzed");
      expect(res.body.data.overview).toHaveProperty("total_profiles");
      expect(res.body.data.overview).toHaveProperty("developer_score");
      expect(res.body.data.overview).toHaveProperty("totals");
    });
  });

  // ─────────────────────────────────────────
  // GET /api/stats/leaderboard
  // ─────────────────────────────────────────
  describe("GET /api/stats/leaderboard", () => {
    it("should return leaderboard with default settings", async () => {
      const res = await request(app).get("/api/stats/leaderboard");

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("success");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty("sort_by", "developer_score");
    });

    it("should support sorting by followers", async () => {
      const res = await request(app)
        .get("/api/stats/leaderboard?sort_by=followers&limit=5");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
      expect(res.body.meta.sort_by).toBe("followers");
    });

    it("should support filtering by language", async () => {
      const res = await request(app)
        .get("/api/stats/leaderboard?lang=JavaScript");

      expect(res.statusCode).toBe(200);
      expect(res.body.meta.filters.language).toBe("JavaScript");
    });

    it("should support filtering by activity tier", async () => {
      const res = await request(app)
        .get("/api/stats/leaderboard?tier=Active");

      expect(res.statusCode).toBe(200);
      expect(res.body.meta.filters.tier).toBe("Active");
    });

    it("should return 400 for invalid sort_by", async () => {
      const res = await request(app)
        .get("/api/stats/leaderboard?sort_by=invalid_field");

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe("error");
    });

    it("should return 400 for invalid tier", async () => {
      const res = await request(app)
        .get("/api/stats/leaderboard?tier=SuperDev");

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe("error");
    });

    it("should cap limit at 50", async () => {
      const res = await request(app)
        .get("/api/stats/leaderboard?limit=999");

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(50);
    });
  });

  // ─────────────────────────────────────────
  // GET /api/stats/languages
  // ─────────────────────────────────────────
  describe("GET /api/stats/languages", () => {
    it("should return language stats", async () => {
      const res = await request(app).get("/api/stats/languages");

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("success");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty("total_languages");
    });

    it("each language entry should have required fields", async () => {
      const res = await request(app).get("/api/stats/languages");

      if (res.body.data.length > 0) {
        const lang = res.body.data[0];
        expect(lang).toHaveProperty("language");
        expect(lang).toHaveProperty("total_repos");
        expect(lang).toHaveProperty("used_by_devs");
        expect(lang).toHaveProperty("avg_percentage");
      }
    });
  });
});