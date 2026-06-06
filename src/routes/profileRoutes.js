import { Router } from "express";
import {
  analyzeUser,
  listProfiles,
  getProfile,
  removeProfile,
  refreshProfile,
  compareProfiles,
} from "../controllers/profileController.js";
import validateUsername from "../middleware/validateUsername.js";

const router = Router();

router.post("/analyze/:username",            validateUsername, analyzeUser);
router.get("/profiles",                                        listProfiles);
router.get("/profiles/:username",            validateUsername, getProfile);
router.delete("/profiles/:username",         validateUsername, removeProfile);
router.get("/profiles/:username/refresh",    validateUsername, refreshProfile);
router.get("/profiles/:username/compare",    validateUsername, compareProfiles);

export default router;