import type { Request, Response, NextFunction } from "express";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const password = process.env.APP_PASSWORD;

  if (!password) {
    return next();
  }

  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (token === password) {
    return next();
  }

  return res.status(401).json({
    error: "unauthorized"
  });
}