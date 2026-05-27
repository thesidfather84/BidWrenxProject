import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, bidsTable, usersTable, jobsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import { getPublicName } from "./auth";


const router: IRouter = Router();

async function formatBid(bid: typeof bidsTable.$inferSelect) {
  const [mech] = await db.select().from(usersTable).where(eq(usersTable.id, bid.mechanicId));
  return {
    id: bid.id, jobId: bid.jobId, mechanicId: bid.mechanicId,
    mechanicName: mech ? getPublicName(mech) : "Unknown", mechanicRating: mech?.rating ?? null,
    amount: bid.amount, estimatedDays: bid.estimatedDays,
    note: bid.note ?? null, status: bid.status,
    createdAt: bid.createdAt.toISOString(),
  };
}

router.get("/jobs/:jobId/bids", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const jobId = parseInt(raw, 10);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid jobId" }); return; }

  const bids = await db.select().from(bidsTable).where(eq(bidsTable.jobId, jobId)).orderBy(desc(bidsTable.createdAt));
  const results = await Promise.all(bids.map(formatBid));
  res.json(results);
});

router.post("/jobs/:jobId/bids", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.userRole !== "mechanic") {
    res.status(403).json({ error: "Only mechanics can bid" });
    return;
  }

  const existingBid = await storage.getBidByJobAndMechanic(
    parseInt(req.params.jobId),
    req.user!.id
  );

  if (existingBid) {
    res.status(400).json({
      error: "You already submitted a bid for this job."
    });
    return;
  }
  const raw = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const jobId = parseInt(raw, 10);
  if (isNaN(jobId)) { res.status(400).json({ error: "Invalid jobId" }); return; }

  const { amount, estimatedDays, note } = req.body;
  if (!amount || !estimatedDays) {
    res.status(400).json({ error: "amount and estimatedDays are required" });
    return;
  }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
  if (!job || job.status !== "open") {
    res.status(400).json({ error: "Job is not open for bids" });
    return;
  }

  const [bid] = await db.insert(bidsTable).values({
    jobId, mechanicId: req.userId!, amount: Number(amount),
    estimatedDays: Number(estimatedDays), note: note ?? null,
  }).returning();

  res.status(201).json(await formatBid(bid));
});

router.get("/bids/my", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const bids = await db.select().from(bidsTable)
    .where(eq(bidsTable.mechanicId, req.userId!))
    .orderBy(desc(bidsTable.createdAt));
  const results = await Promise.all(bids.map(formatBid));
  res.json(results);
});

router.patch("/bids/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [bid] = await db.select().from(bidsTable).where(eq(bidsTable.id, id));
  if (!bid) { res.status(404).json({ error: "Bid not found" }); return; }
  if (bid.mechanicId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const updates: Partial<typeof bidsTable.$inferInsert> = {};
  if (req.body.amount != null) updates.amount = req.body.amount;
  if (req.body.estimatedDays != null) updates.estimatedDays = req.body.estimatedDays;
  if (req.body.note != null) updates.note = req.body.note;

  const [updated] = await db.update(bidsTable).set(updates).where(eq(bidsTable.id, id)).returning();
  res.json(await formatBid(updated));
});

router.delete("/bids/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [bid] = await db.select().from(bidsTable).where(eq(bidsTable.id, id));
  if (!bid) { res.status(404).json({ error: "Bid not found" }); return; }
  if (bid.mechanicId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.update(bidsTable).set({ status: "withdrawn" }).where(eq(bidsTable.id, id));
  res.json({ message: "Bid withdrawn" });
});

router.patch("/bids/:id/accept", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.userRole !== "customer") {
    res.status(403).json({ error: "Only customers can accept bids" });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [bid] = await db.select().from(bidsTable).where(eq(bidsTable.id, id));
  if (!bid) { res.status(404).json({ error: "Bid not found" }); return; }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, bid.jobId));
  if (!job || job.customerId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.update(bidsTable).set({ status: "rejected" }).where(eq(bidsTable.jobId, bid.jobId));
  const [accepted] = await db.update(bidsTable).set({ status: "accepted" }).where(eq(bidsTable.id, id)).returning();
  await db.update(jobsTable).set({ status: "in_progress" }).where(eq(jobsTable.id, bid.jobId));

  res.json(await formatBid(accepted));
});

export default router;
