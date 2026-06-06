// ─────────────────────────────────────────
// Compute developer score (0 - 100)
// ─────────────────────────────────────────
const computeDeveloperScore = (profile, repos) => {
  let score = 0;

  // Followers (max 25 points)
  if (profile.followers >= 1000) score += 25;
  else if (profile.followers >= 500) score += 20;
  else if (profile.followers >= 100) score += 15;
  else if (profile.followers >= 50) score += 10;
  else if (profile.followers >= 10) score += 5;

  // Total stars across all repos (max 25 points)
  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
  if (totalStars >= 1000) score += 25;
  else if (totalStars >= 500) score += 20;
  else if (totalStars >= 100) score += 15;
  else if (totalStars >= 50) score += 10;
  else if (totalStars >= 10) score += 5;

  // Public repos (max 20 points)
  if (profile.public_repos >= 50) score += 20;
  else if (profile.public_repos >= 30) score += 15;
  else if (profile.public_repos >= 20) score += 10;
  else if (profile.public_repos >= 10) score += 7;
  else if (profile.public_repos >= 5) score += 3;

  // Account age (max 15 points)
  const ageInYears =
    (new Date() - new Date(profile.created_at)) / (1000 * 60 * 60 * 24 * 365);
  if (ageInYears >= 5) score += 15;
  else if (ageInYears >= 3) score += 10;
  else if (ageInYears >= 1) score += 5;

  // Profile completeness (max 15 points)
  const completeness = computeProfileCompleteness(profile);
  if (completeness >= 80) score += 15;
  else if (completeness >= 60) score += 10;
  else if (completeness >= 40) score += 5;

  return Math.min(parseFloat(score.toFixed(2)), 100);
};

// ─────────────────────────────────────────
// Compute profile completeness (0 - 100)
// ─────────────────────────────────────────
const computeProfileCompleteness = (profile) => {
  const fields = [
    profile.name,
    profile.bio,
    profile.email,
    profile.blog,
    profile.company,
    profile.location,
    profile.twitter_username,
    profile.avatar_url,
  ];

  const filled = fields.filter((f) => f && f.toString().trim() !== "").length;
  return Math.round((filled / fields.length) * 100);
};

// ─────────────────────────────────────────
// Compute activity tier
// ─────────────────────────────────────────
const computeActivityTier = (repos) => {
  if (!repos.length) return "Inactive";

  // Check how many repos were pushed to in the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentlyActive = repos.filter(
    (r) => r.pushed_at && new Date(r.pushed_at) > sixMonthsAgo
  ).length;

  if (recentlyActive >= 10) return "Power User";
  if (recentlyActive >= 5) return "Active";
  if (recentlyActive >= 1) return "Casual";
  return "Inactive";
};

// ─────────────────────────────────────────
// Compute language breakdown
// ─────────────────────────────────────────
const computeLanguages = (repos) => {
  const langMap = {};

  // Count repos per language (exclude forks and null)
  repos.forEach((r) => {
    if (r.language && !r.fork) {
      langMap[r.language] = (langMap[r.language] || 0) + 1;
    }
  });

  const totalReposWithLang = Object.values(langMap).reduce((a, b) => a + b, 0);

  // Convert to array with percentage
  return Object.entries(langMap)
    .map(([language, repo_count]) => ({
      language,
      repo_count,
      percentage: totalReposWithLang
        ? parseFloat(((repo_count / totalReposWithLang) * 100).toFixed(2))
        : 0,
    }))
    .sort((a, b) => b.repo_count - a.repo_count);
};

// ─────────────────────────────────────────
// Compute top repos (by stars)
// ─────────────────────────────────────────
const computeTopRepos = (repos, limit = 10) => {
  return [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, limit)
    .map((r) => ({
      repo_name: r.name,
      description: r.description,
      url: r.html_url,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      open_issues: r.open_issues_count,
      watchers: r.watchers_count,
      is_fork: r.fork,
      is_archived: r.archived,
      repo_created_at: r.created_at,
      repo_updated_at: r.updated_at,
      repo_pushed_at: r.pushed_at,
    }));
};

// ─────────────────────────────────────────
// Main analysis function
// ─────────────────────────────────────────
export const analyzeProfile = (profile, repos, starredCount) => {
  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
  const totalForks = repos.reduce((sum, r) => sum + r.forks_count, 0);
  const totalOpenIssues = repos.reduce((sum, r) => sum + r.open_issues_count, 0);

  const ownRepos = repos.filter((r) => !r.fork);
  const languages = computeLanguages(repos);
  const topRepos = computeTopRepos(repos);
  const developerScore = computeDeveloperScore(profile, repos);
  const activityTier = computeActivityTier(repos);
  const profileCompleteness = computeProfileCompleteness(profile);

  const accountAgeDays = Math.floor(
    (new Date() - new Date(profile.created_at)) / (1000 * 60 * 60 * 24)
  );

  return {
    // Core profile
    username: profile.login,
    name: profile.name,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    email: profile.email,
    blog: profile.blog,
    company: profile.company,
    location: profile.location,
    twitter_username: profile.twitter_username,
    hireable: profile.hireable ?? false,

    // GitHub stats
    public_repos: profile.public_repos,
    public_gists: profile.public_gists,
    followers: profile.followers,
    following: profile.following,
    starred_repos: starredCount,

    // Computed insights
    developer_score: developerScore,
    activity_tier: activityTier,
    profile_completeness: profileCompleteness,
    avg_stars_per_repo: ownRepos.length
      ? parseFloat((totalStars / ownRepos.length).toFixed(2))
      : 0,
    avg_forks_per_repo: ownRepos.length
      ? parseFloat((totalForks / ownRepos.length).toFixed(2))
      : 0,
    total_stars: totalStars,
    total_forks: totalForks,
    total_open_issues: totalOpenIssues,
    primary_language: languages[0]?.language ?? null,

    // Account info
    account_age_days: accountAgeDays,
    github_created_at: new Date(profile.created_at),
    github_updated_at: new Date(profile.updated_at),

    // Related data
    languages,
    top_repos: topRepos,
  };
};