import ApiError from "../utils/apiError.js";

const validateUsername = (req, res, next) => {
  const { username } = req.params;

  if (!username || username.trim() === "") {
    return next(ApiError.badRequest("Username is required"));
  }

  // GitHub username rules:
  // - Max 39 characters
  // - Only alphanumeric and hyphens
  // - Cannot start or end with a hyphen
  const githubUsernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$|^[a-zA-Z0-9]$/;

  if (!githubUsernameRegex.test(username)) {
    return next(
      ApiError.badRequest(
        "Invalid GitHub username. Only alphanumeric characters and hyphens allowed (max 39 chars, cannot start/end with hyphen)"
      )
    );
  }

  next();
};

export default validateUsername;