import pool from "../config/database.js";
import { sendSuccess } from "../utils/response.js";
import logger from "../utils/logger.js";
import ApiError from "../utils/apiError.js";

// ─────────────────────────────────────────
// GET /api/stats
// Platform-wide overview stats
// ─────────────────────────────────────────
export const getPlatformStats = async (req, res, next) => {
  try {
    logger.debug("Fetching platform stats");

    // Total profiles analyzed
    const [[{ total_profiles }]] = await pool.execute(
      "SELECT COUNT(*) as total_profiles FROM profiles"
    );

    // Average developer score
    const [[{ avg_score, max_score, min_score }]] = await pool.execute(
      `SELECT
         ROUND(AVG(developer_score), 2) as avg_score,
         ROUND(MAX(developer_score), 2) as max_score,
         ROUND(MIN(developer_score), 2) as min_score
       FROM profiles`
    );

    // Total stars, forks, repos across all profiles
    const [[totals]] = await pool.execute(
      `SELECT
         SUM(total_stars)  as total_stars,
         SUM(total_forks)  as total_forks,
         SUM(public_repos) as total_repos,
         SUM(followers)    as total_followers,
         SUM(public_gists) as total_gists
       FROM profiles`
    );

    // Top 10 languages across all profiles
    const [topLanguages] = await pool.execute(
      `SELECT
         language,
         SUM(repo_count)            as total_repos,
         COUNT(DISTINCT username)   as used_by_devs,
         ROUND(AVG(percentage), 2)  as avg_percentage
       FROM languages
       GROUP BY language
       ORDER BY total_repos DESC
       LIMIT 10`
    );

    // Activity tier breakdown
    const [activityBreakdown] = await pool.execute(
      `SELECT
         activity_tier,
         COUNT(*) as count,
         ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM profiles)), 2) as percentage
       FROM profiles
       GROUP BY activity_tier
       ORDER BY count DESC`
    );

    // Top 5 developers by score
    const [topDevelopers] = await pool.execute(
      `SELECT
         username, name, avatar_url,
         developer_score, activity_tier,
         followers, total_stars, primary_language
       FROM profiles
       ORDER BY developer_score DESC
       LIMIT 5`
    );

    // Most followed developers
    const [mostFollowed] = await pool.execute(
      `SELECT
         username, name, avatar_url,
         followers, developer_score, total_stars
       FROM profiles
       ORDER BY followers DESC
       LIMIT 5`
    );

    // Most starred developers
    const [mostStarred] = await pool.execute(
      `SELECT
         username, name, avatar_url,
         total_stars, public_repos, primary_language
       FROM profiles
       ORDER BY total_stars DESC
       LIMIT 5`
    );

    // Hireable developers
    const [[{ hireable_count }]] = await pool.execute(
      "SELECT COUNT(*) as hireable_count FROM profiles WHERE hireable = true"
    );

    // Recently analyzed
    const [recentlyAnalyzed] = await pool.execute(
      `SELECT
         p.username, p.name, p.avatar_url,
         p.developer_score, p.primary_language,
         am.analyzed_at
       FROM profiles p
       JOIN analysis_meta am ON am.profile_id = p.id
       ORDER BY am.analyzed_at DESC
       LIMIT 5`
    );

    // Profile completeness average
    const [[{ avg_completeness }]] = await pool.execute(
      "SELECT ROUND(AVG(profile_completeness), 2) as avg_completeness FROM profiles"
    );

    return sendSuccess(
      res,
      {
        overview: {
          total_profiles,
          hireable_developers: hireable_count,
          avg_profile_completeness: avg_completeness ?? 0,
          developer_score: {
            average: avg_score ?? 0,
            highest: max_score ?? 0,
            lowest:  min_score ?? 0,
          },
          totals: {
            stars:     totals.total_stars     ?? 0,
            forks:     totals.total_forks     ?? 0,
            repos:     totals.total_repos     ?? 0,
            followers: totals.total_followers ?? 0,
            gists:     totals.total_gists     ?? 0,
          },
        },
        top_languages:      topLanguages,
        activity_breakdown: activityBreakdown,
        top_developers:     topDevelopers,
        most_followed:      mostFollowed,
        most_starred:       mostStarred,
        recently_analyzed:  recentlyAnalyzed,
      },
      "Platform stats fetched successfully"
    );
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// GET /api/stats/leaderboard
// Ranked list with filters
// ─────────────────────────────────────────
export const getLeaderboard = async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 10, 50);
    const sortBy = req.query.sort_by || "developer_score";
    const lang   = req.query.lang   || null;
    const tier   = req.query.tier   || null;

    const allowedSorts = [
      "developer_score",
      "followers",
      "total_stars",
      "total_forks",
      "public_repos",
      "account_age_days",
    ];

    if (!allowedSorts.includes(sortBy)) {
      throw ApiError.badRequest(
        `Invalid sort_by. Allowed: ${allowedSorts.join(", ")}`
      );
    }

    const allowedTiers = ["Inactive", "Casual", "Active", "Power User"];
    if (tier && !allowedTiers.includes(tier)) {
      throw ApiError.badRequest(
        `Invalid tier. Allowed: ${allowedTiers.join(", ")}`
      );
    }

    const conditions = [];
    const params     = [];

    if (lang) {
      conditions.push("primary_language = ?");
      params.push(lang);
    }
    if (tier) {
      conditions.push("activity_tier = ?");
      params.push(tier);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [rows] = await pool.execute(
      `SELECT
         ROW_NUMBER() OVER (ORDER BY ${sortBy} DESC) as rank,
         username, name, avatar_url,
         developer_score, activity_tier,
         followers, total_stars, total_forks,
         public_repos, primary_language,
         account_age_days, profile_completeness
       FROM profiles
       ${whereClause}
       ORDER BY ${sortBy} DESC
       LIMIT ?`,
      [...params, limit]
    );

    return sendSuccess(
      res,
      rows,
      "Leaderboard fetched successfully",
      200,
      {
        sort_by: sortBy,
        limit,
        filters: {
          language: lang  ?? "all",
          tier:     tier  ?? "all",
        },
      }
    );
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────
// GET /api/stats/languages
// Full language breakdown across platform
// ─────────────────────────────────────────
export const getLanguageStats = async (req, res, next) => {
  try {
    const [languages] = await pool.execute(
      `SELECT
         language,
         SUM(repo_count)           as total_repos,
         COUNT(DISTINCT username)  as used_by_devs,
         ROUND(AVG(percentage), 2) as avg_percentage
       FROM languages
       GROUP BY language
       ORDER BY total_repos DESC`
    );

    return sendSuccess(
      res,
      languages,
      "Language stats fetched successfully",
      200,
      { total_languages: languages.length }
    );
  } catch (err) {
    next(err);
  }
};
