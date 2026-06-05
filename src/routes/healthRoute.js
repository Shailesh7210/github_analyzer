import { Router } from "express";
import pool from "../config/database.js";

const router = Router();

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

export default router;