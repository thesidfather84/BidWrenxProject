import { Router, type IRouter } from "express";
import { eq, count, desc } from "drizzle-orm";
import { db, jobsTable, bidsTable, usersTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/dashboard/customer", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const jobs = await db.select().from(jobsTable)
    .where(eq(jobsTable.customerId, userId))
    .orderBy(desc(jobsTable.createdAt));

  const openJobs = jobs.filter(j => j.status === "open").length;
  const inProgressJobs = jobs.filter(j => j.status === "in_progress").length;
  const completedJobs = jobs.filter(j => j.status === "completed").length;

  const [{ count: totalBids }] = await db.select({ count: count() }).from(bidsTable)
    .where(eq(bidsTable.jobId, jobs[0]?.id ?? 0));

  let totalBidsReceived = 0;
  for (const job of jobs) {
    const [{ count: bc }] = await db.select({ count: count() }).from(bidsTable).where(eq(bidsTable.jobId, job.id));
    totalBidsReceived += Number(bc);
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const recentJobs = await Promise.all(jobs.slice(0, 5).map(async (job) => {
    const [{ count: bidCount }] = await db.select({ count: count() }).from(bidsTable).where(eq(bidsTable.jobId, job.id));
    return {
      id: job.id, title: job.title, description: job.description, category: job.category,
      vehicleMake: job.vehicleMake, vehicleModel: job.vehicleModel, vehicleYear: job.vehicleYear,
      budgetMin: job.budgetMin ?? null, budgetMax: job.budgetMax ?? null, status: job.status,
      location: job.location, bidCount: Number(bidCount), customerId: job.customerId,
      customerName: user?.name ?? "Unknown", createdAt: job.createdAt.toISOString(), updatedAt: job.updatedAt.toISOString(),
    };
  }));

  res.json({
    totalJobs: jobs.length, openJobs, inProgressJobs, completedJobs,
    totalBidsReceived, recentJobs,
  });
});

router.get("/dashboard/mechanic", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const myBids = await db.select().from(bidsTable)
    .where(eq(bidsTable.mechanicId, userId))
    .orderBy(desc(bidsTable.createdAt));

  const activeBids = myBids.filter(b => b.status === "pending").length;
  const acceptedBids = myBids.filter(b => b.status === "accepted").length;

  const [{ count: availableJobs }] = await db.select({ count: count() }).from(jobsTable)
    .where(eq(jobsTable.status, "open"));

  const recentBids = await Promise.all(myBids.slice(0, 5).map(async (bid) => {
    const [mech] = await db.select().from(usersTable).where(eq(usersTable.id, bid.mechanicId));
    return {
      id: bid.id, jobId: bid.jobId, mechanicId: bid.mechanicId,
      mechanicName: mech?.name ?? "Unknown", mechanicRating: mech?.rating ?? null,
      amount: bid.amount, estimatedDays: bid.estimatedDays, note: bid.note ?? null,
      status: bid.status, createdAt: bid.createdAt.toISOString(),
    };
  }));

  const recentOpenJobs = await db.select().from(jobsTable)
    .where(eq(jobsTable.status, "open"))
    .orderBy(desc(jobsTable.createdAt))
    .limit(5);

  const recentJobs = await Promise.all(recentOpenJobs.map(async (job) => {
    const [cust] = await db.select().from(usersTable).where(eq(usersTable.id, job.customerId));
    const [{ count: bidCount }] = await db.select({ count: count() }).from(bidsTable).where(eq(bidsTable.jobId, job.id));
    return {
      id: job.id, title: job.title, description: job.description, category: job.category,
      vehicleMake: job.vehicleMake, vehicleModel: job.vehicleModel, vehicleYear: job.vehicleYear,
      budgetMin: job.budgetMin ?? null, budgetMax: job.budgetMax ?? null, status: job.status,
      location: job.location, bidCount: Number(bidCount), customerId: job.customerId,
      customerName: cust?.name ?? "Unknown", createdAt: job.createdAt.toISOString(), updatedAt: job.updatedAt.toISOString(),
    };
  }));

  res.json({
    totalBids: myBids.length, activeBids, acceptedBids,
    availableJobs: Number(availableJobs), recentBids, recentJobs,
  });
});

export default router;
