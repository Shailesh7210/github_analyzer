export const sendSuccess = (res, data, message = "Success", statusCode = 200, meta = null) => {
  const response = { status: "success", message, data };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

export const sendError = (res, message = "Something went wrong", statusCode = 500) => {
  return res.status(statusCode).json({ status: "error", message });
};