import { Router } from "express";
import pool from "../config/database.js";
import { fetchRateLimit } from "../services/githubService.js";

const router = Router();

// Health check
router.get("/", async (req, res) => {
  let dbStatus = "connected";
  try {
    const conn = await pool.getConnection();
    conn.release();
  } catch {
    dbStatus = "disconnected";
  }

  res.json({
    status: "success",
    message: "GitHub Profile Analyzer API is running 🚀",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    services: {
      database: dbStatus,
    },
  });
});

// GitHub rate limit status
router.get("/github-rate", async (req, res) => {
  const rateLimit = await fetchRateLimit();

  res.json({
    status: "success",
    message: "GitHub API rate limit status",
    data: rateLimit ?? { error: "Could not fetch rate limit" },
  });
});

export default router;