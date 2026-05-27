import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth, requireFullAuth, type AuthRequest } from "../middlewares/requireAuth";
import { formatUser } from "./auth";

const router: IRouter = Router();

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

router.patch("/users/me/photo", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { photoUrl } = req.body;
  if (!photoUrl || typeof photoUrl !== "string") {
    res.status(400).json({ error: "photoUrl is required" });
    return;
  }

  const [user] = await db.update(usersTable)
    .set({ photoUrl })
    .where(eq(usersTable.id, req.userId!))
    .returning();

  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  req.log.info({ userId: req.userId }, "Profile photo updated");
  res.json(formatUser(user));
});

router.patch("/users/me/verification/documents", requireAuth, requireFullAuth, async (req: AuthRequest, res): Promise<void> => {
  const { insuranceDocumentPath, certificationDocumentPath } = req.body;

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (insuranceDocumentPath !== undefined) updates.insuranceDocumentPath = insuranceDocumentPath;
  if (certificationDocumentPath !== undefined) updates.certificationDocumentPath = certificationDocumentPath;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No document paths provided" });
    return;
  }

  const [user] = await db.update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.userId!))
    .returning();

  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  req.log.info({ userId: req.userId }, "Verification documents updated");
  res.json(formatUser(user));
});

router.post("/users/me/verification/request", requireAuth, requireFullAuth, async (req: AuthRequest, res): Promise<void> => {
  const [current] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!current) { res.status(404).json({ error: "User not found" }); return; }

  if (current.role !== "mechanic") {
    res.status(400).json({ error: "Only mechanics can request verification" });
    return;
  }

  if (current.identityVerificationStatus === "approved") {
    res.status(400).json({ error: "Already approved" });
    return;
  }

  const [user] = await db.update(usersTable)
    .set({
      identityVerificationStatus: "pending",
      verificationRequestedAt: new Date(),
    })
    .where(eq(usersTable.id, req.userId!))
    .returning();

  req.log.info({ userId: req.userId }, "Verification requested");
  res.json(formatUser(user));
});

export default router;
