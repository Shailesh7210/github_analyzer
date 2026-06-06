import pool from "../config/database.js";
import { sendSuccess } from "../utils/response.js";

// ─────────────────────────────────────────
// GET /api/stats
// Platform-wide stats
// ─────────────────────────────────────────
export const getPlatformStats = async (req, res, next) => {
  try {
    // Total profiles
    const [[{ total_profiles }]] = await pool.execute(
      "SELECT COUNT(*) as total_profiles FROM profiles"
    );

    // Average developer score
    const [[{ avg_score }]] = await pool.execute(
      "SELECT ROUND(AVG(developer_score), 2) as avg_score FROM profiles"
    );

    // Top languages across all profiles
    const [topLanguages] = await pool.execute(
      `SELECT language, SUM(repo_count) as total_repos
       FROM languages
       GROUP BY language
       ORDER BY total_repos DESC
       LIMIT 10`
    );

    // Top profiles by developer score
    const [topDevelopers] = await pool.execute(
      `SELECT username, name, avatar_url, developer_score, activity_tier,
              followers, total_stars, primary_language
       FROM profiles
       ORDER BY developer_score DESC
       LIMIT 5`
    );

    // Top profiles by followers
    const [mostFollowed] = await pool.execute(
      `SELECT username, name, avatar_url, followers, developer_score
       FROM profiles
       ORDER BY followers DESC
       LIMIT 5`
    );

    // Activity tier breakdown
    const [activityBreakdown] = await pool.execute(
      `SELECT activity_tier, COUNT(*) as count
       FROM profiles
       GROUP BY activity_tier
       ORDER BY count DESC`
    );

    // Total stars & forks across all profiles
    const [[totals]] = await pool.execute(
      `SELECT
         SUM(total_stars) as total_stars,
         SUM(total_forks) as total_forks,
         SUM(public_repos) as total_repos
       FROM profiles`
    );

    // Most recently analyzed
    const [recentlyAnalyzed] = await pool.execute(
      `SELECT p.username, p.name, p.avatar_url, am.analyzed_at
       FROM profiles p
       JOIN analysis_meta am ON am.profile_id = p.id
       ORDER BY am.analyzed_at DESC
       LIMIT 5`
    );

    return sendSuccess(
      res,
      {
        overview: {
          total_profiles,
          avg_developer_score: avg_score ?? 0,
          total_stars: totals.total_stars ?? 0,
          total_forks: totals.total_forks ?? 0,
          total_repos: totals.total_repos ?? 0,
        },
        top_languages: topLanguages,
        top_developers: topDevelopers,
        most_followed: mostFollowed,
        activity_breakdown: activityBreakdown,
        recently_analyzed: recentlyAnalyzed,
      },
      "Platform stats fetched successfully"
    );
  } catch (err) {
    next(err);
  }
};