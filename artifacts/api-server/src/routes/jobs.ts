import { Router, type IRouter } from "express";
import { eq, desc, count, ilike, and } from "drizzle-orm";
import { db, jobsTable, usersTable, bidsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import { getPublicName } from "./auth";

const router: IRouter = Router();

function formatJob(job: typeof jobsTable.$inferSelect, user: typeof usersTable.$inferSelect, bidCount: number) {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    category: job.category,
    vehicleMake: job.vehicleMake,
    vehicleModel: job.vehicleModel,
    vehicleYear: job.vehicleYear,
    budgetMin: job.budgetMin ?? null,
    budgetMax: job.budgetMax ?? null,
    status: job.status,
    location: job.location,
    photos: (job.photos ?? []) as string[],
    bidCount,
    customerId: job.customerId,
    customerName: getPublicName(user),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

router.get("/jobs", async (req, res): Promise<void> => {
  const { status, category, search } = req.query as Record<string, string>;

  const conditions = [];
  if (status) conditions.push(eq(jobsTable.status, status as "open" | "in_progress" | "completed" | "cancelled"));
  if (category) conditions.push(eq(jobsTable.category, category));
  if (search) conditions.push(ilike(jobsTable.title, `%${search}%`));

  const jobs = await db.select().from(jobsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(jobsTable.createdAt));

  const results = await Promise.all(jobs.map(async (job) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, job.customerId));
    const [{ count: bidCount }] = await db.select({ count: count() }).from(bidsTable).where(eq(bidsTable.jobId, job.id));
    return formatJob(job, user, Number(bidCount));
  }));

  res.json(results);
});

router.post("/jobs", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.userRole !== "customer") {
    res.status(403).json({ error: "Only customers can post jobs" });
    return;
  }
  const { title, description, category, vehicleMake, vehicleModel, vehicleYear, budgetMin, budgetMax, location, photos } = req.body;
  if (!title || !description || !category || !vehicleMake || !vehicleModel || !vehicleYear || !location) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const photoList: string[] = Array.isArray(photos) ? photos.slice(0, 5) : [];

  const [job] = await db.insert(jobsTable).values({
    title, description, category, vehicleMake, vehicleModel,
    vehicleYear: Number(vehicleYear),
    budgetMin: budgetMin ? Number(budgetMin) : null,
    budgetMax: budgetMax ? Number(budgetMax) : null,
    location,
    photos: photoList,
    customerId: req.userId!,
  }).returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  res.status(201).json(formatJob(job, user, 0));
});

router.get("/jobs/my", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const jobs = await db.select().from(jobsTable)
    .where(eq(jobsTable.customerId, req.userId!))
    .orderBy(desc(jobsTable.createdAt));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));

  const results = await Promise.all(jobs.map(async (job) => {
    const [{ count: bidCount }] = await db.select({ count: count() }).from(bidsTable).where(eq(bidsTable.jobId, job.id));
    return formatJob(job, user, Number(bidCount));
  }));

  res.json(results);
});

router.get("/jobs/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, job.customerId));

  const bids = await db.select().from(bidsTable).where(eq(bidsTable.jobId, id)).orderBy(desc(bidsTable.createdAt));
  const formattedBids = await Promise.all(bids.map(async (bid) => {
    const [mech] = await db.select().from(usersTable).where(eq(usersTable.id, bid.mechanicId));
    return {
      id: bid.id, jobId: bid.jobId, mechanicId: bid.mechanicId,
      mechanicName: mech ? getPublicName(mech) : "Unknown",
      mechanicRating: mech?.rating ?? null,
      mechanicReviewCount: mech?.reviewCount ?? 0,
      mechanicPhotoUrl: mech?.photoUrl ?? null,
      mechanicAdminVerified: mech?.adminVerifiedMechanic ?? false,
      amount: bid.amount, estimatedDays: bid.estimatedDays,
      note: bid.note ?? null, status: bid.status,
      createdAt: bid.createdAt.toISOString(),
    };
  }));

  res.json({ ...formatJob(job, user, bids.length), bids: formattedBids });
});

router.patch("/jobs/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  if (job.customerId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const updates: Partial<typeof jobsTable.$inferInsert> = {};
  if (req.body.title != null) updates.title = req.body.title;
  if (req.body.description != null) updates.description = req.body.description;
  if (req.body.status != null) updates.status = req.body.status;
  if (req.body.budgetMin != null) updates.budgetMin = req.body.budgetMin;
  if (req.body.budgetMax != null) updates.budgetMax = req.body.budgetMax;

  const [updated] = await db.update(jobsTable).set(updates).where(eq(jobsTable.id, id)).returning();
  const [jobUser] = await db.select().from(usersTable).where(eq(usersTable.id, updated.customerId));
  const [{ count: bidCount }] = await db.select({ count: count() }).from(bidsTable).where(eq(bidsTable.jobId, id));
  res.json(formatJob(updated, jobUser, Number(bidCount)));
});

router.delete("/jobs/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  if (job.customerId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(jobsTable).where(eq(jobsTable.id, id));
  res.json({ message: "Job deleted" });
});

export default router;
