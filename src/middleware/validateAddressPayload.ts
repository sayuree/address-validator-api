import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "./errorHandler.js";

const MAX_ADDRESS_LENGTH = 512;

/**
 * Validates and normalizes a free-form address string.
 * - Requires a string input
 * - Trims and collapses whitespace, converts CR/LF/TAB to space
 * - Removes NUL characters and rejects other control characters
 * - Enforces a conservative max length to prevent abuse
 * Sets the normalized value back to `req.body.address`.
 */
export function validateAddressPayload(req: Request, _res: Response, next: NextFunction) {
  const raw = req.body?.address;

  if (typeof raw !== "string") {
    return next(new BadRequestError("'address' must be a string"));
  }

  // Remove NULs, normalize whitespace
  const withoutNull = raw.replace(/\u0000/g, "");
  // Reject disallowed control characters (allow CR/LF/TAB since we convert them)
  if (/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(withoutNull)) {
    return next(new BadRequestError("'address' contains invalid control characters"));
  }

  const whitespaceNormalized = withoutNull.replace(/[\r\n\t]+/g, " ");
  const collapsed = whitespaceNormalized.replace(/\s+/g, " ");
  const normalized = collapsed.trim();

  if (normalized.length === 0) {
    return next(new BadRequestError("'address' must be a non-empty string"));
  }

  // Length guard (use original length to avoid bypass via normalization)
  const originalLength = raw.length;
  if (originalLength > MAX_ADDRESS_LENGTH) {
    return next(new BadRequestError(`'address' exceeds ${MAX_ADDRESS_LENGTH} characters`));
  }

  req.body.address = normalized;
  next();
}


