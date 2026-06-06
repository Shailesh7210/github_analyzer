import { Router } from "express";
import {
  getPlatformStats,
  getLeaderboard,
  getLanguageStats,
} from "../controllers/statsController.js";

const router = Router();

// Platform overview stats
router.get("/stats", getPlatformStats);

// Leaderboard with filters
router.get("/stats/leaderboard", getLeaderboard);

// Language breakdown
router.get("/stats/languages", getLanguageStats);

export default router;
