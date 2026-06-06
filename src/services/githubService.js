import axios from "axios";
import ApiError from "../utils/apiError.js";

// GitHub API client
const githubClient = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(process.env.GITHUB_TOKEN && {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    }),
  },
  timeout: 10000,
});

// ─────────────────────────────────────────
// Handle GitHub API errors consistently
// ─────────────────────────────────────────
const handleGithubError = (err, username) => {
  if (err.response?.status === 404) {
    throw ApiError.notFound(`GitHub user '${username}' not found`);
  }
  if (err.response?.status === 403 || err.response?.status === 429) {
    throw ApiError.rateLimited(
      "GitHub API rate limit exceeded. Add a GITHUB_TOKEN in your .env to increase limits."
    );
  }
  if (err.response?.status === 401) {
    throw ApiError.internal("Invalid GitHub token. Check your GITHUB_TOKEN in .env");
  }
  throw ApiError.internal(`GitHub API error: ${err.message}`);
};

// ─────────────────────────────────────────
// Fetch core user profile
// ─────────────────────────────────────────
export const fetchUserProfile = async (username) => {
  try {
    const { data } = await githubClient.get(`/users/${username}`);
    return data;
  } catch (err) {
    handleGithubError(err, username);
  }
};

// ─────────────────────────────────────────
// Fetch all public repos (handles pagination)
// ─────────────────────────────────────────
export const fetchUserRepos = async (username) => {
  try {
    let page = 1;
    let allRepos = [];

    while (true) {
      const { data } = await githubClient.get(`/users/${username}/repos`, {
        params: {
          per_page: 100,
          page,
          sort: "updated",
          direction: "desc",
        },
      });

      allRepos = [...allRepos, ...data];

      // Stop if last page
      if (data.length < 100) break;
      page++;
    }

    return allRepos;
  } catch (err) {
    handleGithubError(err, username);
  }
};

// ─────────────────────────────────────────
// Fetch starred repos count
// ─────────────────────────────────────────
export const fetchStarredCount = async (username) => {
  try {
    const { headers } = await githubClient.get(`/users/${username}/starred`, {
      params: { per_page: 1 },
    });

    // Parse total from Link header if available
    const link = headers["link"];
    if (link) {
      const match = link.match(/page=(\d+)>; rel="last"/);
      if (match) return parseInt(match[1]);
    }

    return 0;
  } catch {
    // Non-critical — return 0 if fails
    return 0;
  }
};

// ─────────────────────────────────────────
// Check GitHub API rate limit status
// ─────────────────────────────────────────
export const fetchRateLimit = async () => {
  try {
    const { data } = await githubClient.get("/rate_limit");
    return {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      reset: new Date(data.rate.reset * 1000).toISOString(),
      used: data.rate.used,
    };
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────
// Fetch everything for a user in one call
// ─────────────────────────────────────────
export const fetchAllUserData = async (username) => {
  // Run profile + repos + starred in parallel
  const [profile, repos, starredCount] = await Promise.all([
    fetchUserProfile(username),
    fetchUserRepos(username),
    fetchStarredCount(username),
  ]);

  return { profile, repos, starredCount };
};