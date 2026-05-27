import { type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "./requireAuth";

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  requireAuth(req, res, async () => {
    if (req.isPinSession) {
      res.status(403).json({
        error: "Admin actions require full password login.",
        code: "PIN_SESSION",
      });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!user?.isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}
