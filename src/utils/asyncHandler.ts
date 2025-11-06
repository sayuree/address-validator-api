import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async Express handler and forwards rejected promises to `next`.
 *
 * @param {(req: Request, res: Response, next: NextFunction) => Promise<unknown>} handler
 * @return {RequestHandler} Express-compatible handler
 */
export function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}


