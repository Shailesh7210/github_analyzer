import { fetchAllUserData } from "../services/githubService.js";
import { analyzeProfile } from "../services/analysisService.js";
import {
  saveProfile,
  getFullProfile,
  getAllProfiles,
  deleteProfile,
  getCachedProfile,
} from "../services/profileService.js";
import { sendSuccess } from "../utils/response.js";
import ApiError from "../utils/apiError.js";
import logger from "../utils/logger.js";
import { queueRequest } from "../utils/requestQueue.js";

// ─────────────────────────────────────────
// POST /api/analyze/:username
// ─────────────────────────────────────────
export const analyzeUser = async (req, res, next) => {
  try {
    const { username } = req.params;
    const forceRefresh = req.query.refresh === "true";

    // Check cache first
    if (!forceRefresh) {
      const cached = await getCachedProfile(username);
      if (cached) {
        logger.info("Cache hit", { username });
        const full = await getFullProfile(username);
        return sendSuccess(
          res,
          full,
          `Profile loaded from cache for '${username}'`,
          200,
          { source: "cache", cache_expires_at: cached.cache_expires_at }
        );
      }
    }

    logger.info("Fetching from GitHub", { username, forceRefresh });

    // Queue request — prevents duplicate GitHub API calls
    const result = await queueRequest(`analyze:${username}`, async () => {
      const { profile, repos, starredCount } = await fetchAllUserData(username);
      const insights = analyzeProfile(profile, repos, starredCount);
      await saveProfile(insights);
      return getFullProfile(username);
    });

    logger.info("Profile analyzed and stored", {
      username,
      developer_score: result.developer_score,
      repos: result.public_repos,
    });

    return sendSuccess(
      res,
      result,
      `Profile for '${username}' analyzed and stored successfully`,
      201,
      { source: "github" }
    );
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// GET /api/profiles
// ─────────────────────────────────────────
export const listProfiles = async (req, res, next) => {
  try {
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const sort  = req.query.sort  || "created_at";
    const order = req.query.order || "DESC";
    const lang  = req.query.lang  || null;

    logger.debug("Listing profiles", { page, limit, sort, order, lang });

    const result = await getAllProfiles({ page, limit, sort, order, lang });

    return sendSuccess(
      res,
      result.profiles,
      "Profiles fetched successfully",
      200,
      result.meta
    );
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// GET /api/profiles/:username
// ─────────────────────────────────────────
export const getProfile = async (req, res, next) => {
  try {
    const { username } = req.params;

    const profile = await getFullProfile(username);

    if (!profile) {
      throw ApiError.notFound(
        `Profile '${username}' not found. Use POST /api/analyze/${username} to analyze it first.`
      );
    }

    logger.debug("Profile fetched", { username });

    return sendSuccess(res, profile, `Profile for '${username}' fetched successfully`);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// DELETE /api/profiles/:username
// ─────────────────────────────────────────
export const removeProfile = async (req, res, next) => {
  try {
    const { username } = req.params;

    const deleted = await deleteProfile(username);

    if (!deleted) {
      throw ApiError.notFound(`Profile '${username}' not found`);
    }

    logger.info("Profile deleted", { username });

    return sendSuccess(res, null, `Profile '${username}' deleted successfully`);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// GET /api/profiles/:username/refresh
// ─────────────────────────────────────────
export const refreshProfile = async (req, res, next) => {
  try {
    const { username } = req.params;

    const existing = await getFullProfile(username);
    if (!existing) {
      throw ApiError.notFound(
        `Profile '${username}' not found. Use POST /api/analyze/${username} first.`
      );
    }

    logger.info("Force refreshing profile", { username });

    const result = await queueRequest(`analyze:${username}`, async () => {
      const { profile, repos, starredCount } = await fetchAllUserData(username);
      const insights = analyzeProfile(profile, repos, starredCount);
      await saveProfile(insights);
      return getFullProfile(username);
    });

    return sendSuccess(
      res,
      result,
      `Profile '${username}' refreshed successfully`,
      200,
      { source: "github" }
    );
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// GET /api/profiles/:username/compare?with=x
// ─────────────────────────────────────────
export const compareProfiles = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { with: compareWith } = req.query;

    if (!compareWith) {
      throw ApiError.badRequest("Query param 'with' is required. e.g. ?with=torvalds");
    }

    const [profileA, profileB] = await Promise.all([
      getFullProfile(username),
      getFullProfile(compareWith),
    ]);

    if (!profileA) {
      throw ApiError.notFound(`Profile '${username}' not found. Analyze it first.`);
    }
    if (!profileB) {
      throw ApiError.notFound(`Profile '${compareWith}' not found. Analyze it first.`);
    }

    logger.debug("Comparing profiles", { username, compareWith });

    const comparison = {
      profiles: [
        buildCompareSummary(profileA),
        buildCompareSummary(profileB),
      ],
      winner: {
        developer_score:
          profileA.developer_score >= profileB.developer_score
            ? profileA.username : profileB.username,
        followers:
          profileA.followers >= profileB.followers
            ? profileA.username : profileB.username,
        total_stars:
          profileA.total_stars >= profileB.total_stars
            ? profileA.username : profileB.username,
        public_repos:
          profileA.public_repos >= profileB.public_repos
            ? profileA.username : profileB.username,
      },
    };

    return sendSuccess(res, comparison, "Profiles compared successfully");
  } catch (err) {
    next(err);
  }
};

const buildCompareSummary = (p) => ({
  username:             p.username,
  name:                 p.name,
  avatar_url:           p.avatar_url,
  developer_score:      p.developer_score,
  activity_tier:        p.activity_tier,
  followers:            p.followers,
  following:            p.following,
  public_repos:         p.public_repos,
  total_stars:          p.total_stars,
  total_forks:          p.total_forks,
  primary_language:     p.primary_language,
  account_age_days:     p.account_age_days,
  profile_completeness: p.profile_completeness,
});