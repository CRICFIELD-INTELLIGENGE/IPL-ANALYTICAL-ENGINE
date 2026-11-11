import type { ErrorRequestHandler, RequestHandler } from "express";

// Keep framing/media integrations working while protecting the document itself.
// A restrictive script allowlist needs a separate deployment inventory of ads and embeds.
export const securityHeaders: RequestHandler = (req, res, next) => {
  res.removeHeader("X-Powered-By");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'");
  if (process.env.NODE_ENV === "production" && req.secure) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000");
  }
  next();
};

export const publicErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error?.type === "entity.too.large" ? 413
    : error?.type === "entity.parse.failed" || error instanceof URIError ? 400 : 500;
  // Do not log request bodies, provider responses, SQL, credentials or raw exception messages.
  req.log?.error({ status, errorType: error instanceof Error ? error.name : "Error" }, "Request failed");
  res.status(status).json({ error: status === 413 ? "request_too_large" : status === 400 ? "invalid_request" : "internal_error" });
};
