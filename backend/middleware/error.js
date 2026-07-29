export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || String(status);
  }
}

export const notFound = (_req, res) =>
  res.status(404).json({ error: { message: "Route not found", code: "404" } });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error("[error]", err);
  res.status(status).json({
    error: { message: err.message || "Server error", code: err.code || String(status) },
  });
};
