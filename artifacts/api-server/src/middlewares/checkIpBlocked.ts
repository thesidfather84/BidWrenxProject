import { type Request, type Response, type NextFunction } from "express";
import { db, ipBlocklistTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getClientIp } from "../lib/getIp";

export async function checkIpBlocked(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ip = getClientIp(req);
    if (ip === "unknown" || ip === "::1" || ip === "127.0.0.1") {
      next();
      return;
    }
    const [blocked] = await db.select({ id: ipBlocklistTable.id })
      .from(ipBlocklistTable)
      .where(eq(ipBlocklistTable.ip, ip));
    if (blocked) {
      res.status(403).json({
        error: "Access restricted. Contact support if you believe this is a mistake.",
        code: "IP_BLOCKED",
      });
      return;
    }
  } catch {
    // Don't block requests if the check fails
  }
  next();
}
