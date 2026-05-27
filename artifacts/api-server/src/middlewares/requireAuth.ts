import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../lib/auth";

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
  isPinSession?: boolean;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  req.userId = payload.userId;
  req.userRole = payload.role;
  req.isPinSession = payload.sessionType === "pin";
  next();
}

export function requireFullAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.isPinSession) {
    res.status(403).json({
      error: "This action requires full password login.",
      code: "PIN_SESSION",
    });
    return;
  }
  next();
}

export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.userRole !== role) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
