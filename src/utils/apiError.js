class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ApiError";
  }

  static notFound(message) {
    return new ApiError(message, 404);
  }

  static rateLimited(message) {
    return new ApiError(message, 429);
  }

  static badRequest(message) {
    return new ApiError(message, 400);
  }

  static internal(message) {
    return new ApiError(message, 500);
  }
}

export default ApiError;