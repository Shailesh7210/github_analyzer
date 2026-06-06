import pool from "../config/database.js";

// ─────────────────────────────────────────
// Check if profile is cached (fresh)
// ─────────────────────────────────────────
export const getCachedProfile = async (username) => {
  const [rows] = await pool.execute(
    `SELECT am.cache_expires_at, p.*
     FROM profiles p
     JOIN analysis_meta am ON am.profile_id = p.id
     WHERE p.username = ?
     ORDER BY am.analyzed_at DESC
     LIMIT 1`,
    [username]
  );

  if (!rows.length) return null;

  const profile = rows[0];
  const isExpired = new Date() > new Date(profile.cache_expires_at);

  if (isExpired) return null;

  return profile;
};

// ─────────────────────────────────────────
// Save or update full profile in DB
// ─────────────────────────────────────────
export const saveProfile = async (insights) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Upsert profile
    const [result] = await connection.execute(
      `INSERT INTO profiles (
        username, name, avatar_url, bio, email, blog, company, location,
        twitter_username, hireable, public_repos, public_gists, followers,
        following, starred_repos, developer_score, activity_tier,
        profile_completeness, avg_stars_per_repo, avg_forks_per_repo,
        total_stars, total_forks, total_open_issues, primary_language,
        account_age_days, github_created_at, github_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        avatar_url = VALUES(avatar_url),
        bio = VALUES(bio),
        email = VALUES(email),
        blog = VALUES(blog),
        company = VALUES(company),
        location = VALUES(location),
        twitter_username = VALUES(twitter_username),
        hireable = VALUES(hireable),
        public_repos = VALUES(public_repos),
        public_gists = VALUES(public_gists),
        followers = VALUES(followers),
        following = VALUES(following),
        starred_repos = VALUES(starred_repos),
        developer_score = VALUES(developer_score),
        activity_tier = VALUES(activity_tier),
        profile_completeness = VALUES(profile_completeness),
        avg_stars_per_repo = VALUES(avg_stars_per_repo),
        avg_forks_per_repo = VALUES(avg_forks_per_repo),
        total_stars = VALUES(total_stars),
        total_forks = VALUES(total_forks),
        total_open_issues = VALUES(total_open_issues),
        primary_language = VALUES(primary_language),
        account_age_days = VALUES(account_age_days),
        github_created_at = VALUES(github_created_at),
        github_updated_at = VALUES(github_updated_at),
        updated_at = CURRENT_TIMESTAMP`,
      [
        insights.username,
        insights.name,
        insights.avatar_url,
        insights.bio,
        insights.email,
        insights.blog,
        insights.company,
        insights.location,
        insights.twitter_username,
        insights.hireable,
        insights.public_repos,
        insights.public_gists,
        insights.followers,
        insights.following,
        insights.starred_repos,
        insights.developer_score,
        insights.activity_tier,
        insights.profile_completeness,
        insights.avg_stars_per_repo,
        insights.avg_forks_per_repo,
        insights.total_stars,
        insights.total_forks,
        insights.total_open_issues,
        insights.primary_language,
        insights.account_age_days,
        insights.github_created_at,
        insights.github_updated_at,
      ]
    );

    // Get profile id
    let profileId;
    if (result.insertId) {
      profileId = result.insertId;
    } else {
      const [existing] = await connection.execute(
        "SELECT id FROM profiles WHERE username = ?",
        [insights.username]
      );
      profileId = existing[0].id;
    }

    // 2. Delete old repos + languages (replace with fresh data)
    await connection.execute("DELETE FROM repositories WHERE profile_id = ?", [profileId]);
    await connection.execute("DELETE FROM languages WHERE profile_id = ?", [profileId]);

    // 3. Insert top repos
    if (insights.top_repos.length > 0) {
      const repoValues = insights.top_repos.map((r) => [
        profileId,
        insights.username,
        r.repo_name,
        r.description,
        r.url,
        r.language,
        r.stars,
        r.forks,
        r.open_issues,
        r.watchers,
        r.is_fork,
        r.is_archived,
        r.repo_created_at ? new Date(r.repo_created_at) : null,
        r.repo_updated_at ? new Date(r.repo_updated_at) : null,
        r.repo_pushed_at ? new Date(r.repo_pushed_at) : null,
      ]);

      await connection.query(
        `INSERT INTO repositories (
          profile_id, username, repo_name, description, url, language,
          stars, forks, open_issues, watchers, is_fork, is_archived,
          repo_created_at, repo_updated_at, repo_pushed_at
        ) VALUES ?`,
        [repoValues]
      );
    }

    // 4. Insert languages
    if (insights.languages.length > 0) {
      const langValues = insights.languages.map((l) => [
        profileId,
        insights.username,
        l.language,
        l.repo_count,
        l.percentage,
      ]);

      await connection.query(
        `INSERT INTO languages (profile_id, username, language, repo_count, percentage)
         VALUES ?`,
        [langValues]
      );
    }

    // 5. Insert analysis meta
    const cacheTTL = parseInt(process.env.CACHE_TTL_SECONDS) || 3600;
    const cacheExpiresAt = new Date(Date.now() + cacheTTL * 1000);

    await connection.execute(
      `INSERT INTO analysis_meta (
        profile_id, username, cache_expires_at, github_api_calls, status
      ) VALUES (?, ?, ?, ?, ?)`,
      [profileId, insights.username, cacheExpiresAt, 3, "success"]
    );

    await connection.commit();
    return profileId;

  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────
// Get full profile with repos + languages
// ─────────────────────────────────────────
export const getFullProfile = async (username) => {
  const [profiles] = await pool.execute(
    "SELECT * FROM profiles WHERE username = ?",
    [username]
  );

  if (!profiles.length) return null;

  const profile = profiles[0];

  const [repos] = await pool.execute(
    "SELECT * FROM repositories WHERE profile_id = ? ORDER BY stars DESC",
    [profile.id]
  );

  const [languages] = await pool.execute(
    "SELECT * FROM languages WHERE profile_id = ? ORDER BY repo_count DESC",
    [profile.id]
  );

  const [meta] = await pool.execute(
    "SELECT * FROM analysis_meta WHERE profile_id = ? ORDER BY analyzed_at DESC LIMIT 1",
    [profile.id]
  );

  return {
    ...profile,
    repositories: repos,
    languages,
    last_analyzed: meta[0]?.analyzed_at ?? null,
    cache_expires_at: meta[0]?.cache_expires_at ?? null,
  };
};

// ─────────────────────────────────────────
// Get all profiles (with pagination)
// ─────────────────────────────────────────
export const getAllProfiles = async ({ page = 1, limit = 10, sort = "created_at", order = "DESC", lang = null }) => {
  const offset = (page - 1) * limit;

  const allowedSorts = [
    "developer_score", "followers", "total_stars",
    "public_repos", "created_at", "updated_at"
  ];
  const sortCol = allowedSorts.includes(sort) ? sort : "created_at";
  const sortOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

  let whereClause = "";
  const params = [];

  if (lang) {
    whereClause = "WHERE primary_language = ?";
    params.push(lang);
  }

  const [profiles] = await pool.execute(
    `SELECT
      id, username, name, avatar_url, bio, location,
      public_repos, followers, following, total_stars,
      developer_score, activity_tier, primary_language,
      profile_completeness, account_age_days, created_at, updated_at
     FROM profiles
     ${whereClause}
     ORDER BY ${sortCol} ${sortOrder}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) as total FROM profiles ${whereClause}`,
    params
  );

  return {
    profiles,
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    },
  };
};

// ─────────────────────────────────────────
// Delete a profile
// ─────────────────────────────────────────
export const deleteProfile = async (username) => {
  const [result] = await pool.execute(
    "DELETE FROM profiles WHERE username = ?",
    [username]
  );
  return result.affectedRows > 0;
};