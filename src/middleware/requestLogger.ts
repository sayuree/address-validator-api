import { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import { logger } from "../utils/logger.js";

function genId() {
  try {
    return randomUUID();
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = req.headers["x-request-id"]?.toString() || genId();
  res.locals.requestId = requestId;

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    logger.info("request.completed", {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs,
    });
  });

  next();
}


