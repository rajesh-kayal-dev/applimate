import type { Request, Response } from "express";
import {
  isAuthenticationRequired,
  authenticateUser
} from "./auth.service.js";

export function checkAuthRequired(_req: Request, res: Response) {
  return res.json({
    required: isAuthenticationRequired()
  });
}

export function login(req: Request, res: Response) {
  const result = authenticateUser(req.body?.password);

  if (!result.success) {
    return res.status(401).json({
      error: result.error
    });
  }

  return res.json({
    token: result.token
  });
}