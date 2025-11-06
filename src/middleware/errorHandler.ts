import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";

/**
 * Base HTTP error carrying status code and optional details.
 */
export class HttpError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * 400 Bad Request error.
 */
export class BadRequestError extends HttpError {
  constructor(message = "Bad Request", details?: unknown) {
    super(400, message, details);
  }
}

/**
 * 404 Not Found error.
 */
export class NotFoundError extends HttpError {
  constructor(message = "Not Found", details?: unknown) {
    super(404, message, details);
  }
}

/**
 * Terminates request chain with a 404 when no route matched.
 */
export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new NotFoundError("Route not found"));
}

/**
 * Centralized error handler. Converts thrown/forwarded errors to a
 * consistent JSON payload and HTTP status code.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const isHttp = err instanceof HttpError;
  const status = isHttp ? err.statusCode : 500;
  const message = isHttp ? err.message : "Internal server error";
  const details = isHttp ? err.details : undefined;

  logger.error("request.error", {
    requestId: res.locals?.requestId,
    status,
    message,
    details,
  });
  res.status(status).json({ error: message, details });
}


