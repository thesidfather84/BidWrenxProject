import { Router, type IRouter } from "express";
import { eq, count, avg, sql, and, ilike, or, desc, isNull, isNotNull } from "drizzle-orm";
import {
  db, usersTable, jobsTable, bidsTable, messagesTable, reportsTable,
  ipBlocklistTable, adminAuditLogTable, loginHistoryTable,
} from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";
import type { AuthRequest } from "../middlewares/requireAuth";
import { getClientIp } from "../lib/getIp";

const router: IRouter = Router();

async function logAdminAction(
  adminId: number,
  action: string,
  targetUserId: number | null,
  details: string | null,
  ip: string | null,
): Promise<void> {
  try {
    await db.insert(adminAuditLogTable).values({
      adminId,
      action,
      ...(targetUserId != null ? { targetUserId } : {}),
      ...(details != null ? { details } : {}),
      ...(ip != null ? { ip } : {}),
    });
  } catch {
    // Don't fail requests if audit logging fails
  }
}

function formatAdminUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    rating: u.rating ?? null,
    reviewCount: u.reviewCount,
    warningCount: u.warningCount,
    flaggedForReview: u.flaggedForReview,
    suspended: u.suspended,
    banned: u.banned,
    verified: u.verified,
    isAdmin: u.isAdmin,
    photoUrl: u.photoUrl ?? null,
    emailVerified: u.emailVerified,
    phoneVerified: u.phoneVerified,
    identityVerificationStatus: u.identityVerificationStatus,
    insuranceDocumentPath: u.insuranceDocumentPath ?? null,
    certificationDocumentPath: u.certificationDocumentPath ?? null,
    adminVerifiedMechanic: u.adminVerifiedMechanic,
    verificationNotes: u.verificationNotes ?? null,
    verificationRequestedAt: u.verificationRequestedAt ? u.verificationRequestedAt.toISOString() : null,
    termsAcceptedAt: u.termsAcceptedAt ? u.termsAcceptedAt.toISOString() : null,
    adminNotes: u.adminNotes ?? null,
    lastLoginIp: u.lastLoginIp ?? null,
    signupIp: u.signupIp ?? null,
    deletedAt: u.deletedAt ? u.deletedAt.toISOString() : null,
    referralCode: u.referralCode ?? null,
    referredBy: u.referredBy ?? null,
    specialties: u.specialties ?? null,
    // Identity / privacy fields
    legalName: u.legalName ?? null,
    displayName: u.displayName ?? null,
    username: u.username ?? null,
    showLegalNamePublicly: u.showLegalNamePublicly,
    // Map presence
    mapVisible: u.mapVisible,
    mapCity: u.mapCity ?? null,
    mapState: u.mapState ?? null,
    mapLat: u.mapLat ?? null,
    mapLng: u.mapLng ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

// GET /admin/stats
router.get("/admin/stats", requireAdmin, async (_req: AuthRequest, res): Promise<void> => {
  const [userStats] = await db.select({
    totalUsers: count(),
    totalCustomers: sql<number>`count(*) filter (where role = 'customer')`,
    totalMechanics: sql<number>`count(*) filter (where role = 'mechanic')`,
    suspendedUsers: sql<number>`count(*) filter (where suspended = true)`,
    avgMechanicRating: avg(usersTable.rating),
  }).from(usersTable).where(eq(usersTable.isAdmin, false));

  const [jobStats] = await db.select({
    totalJobs: count(),
    completedJobs: sql<number>`count(*) filter (where status = 'completed')`,
    openJobs: sql<number>`count(*) filter (where status = 'open')`,
  }).from(jobsTable);

  const [{ totalBids }] = await db.select({ totalBids: count() }).from(bidsTable);
  const [{ totalMessages }] = await db.select({ totalMessages: count() }).from(messagesTable);
  const [{ totalReports }] = await db.select({ totalReports: count() }).from(reportsTable);
  const [{ unreviewedReports }] = await db.select({
    unreviewedReports: count(),
  }).from(reportsTable).where(eq(reportsTable.reviewed, false));

  res.json({
    totalUsers: Number(userStats.totalUsers),
    totalCustomers: Number(userStats.totalCustomers),
    totalMechanics: Number(userStats.totalMechanics),
    suspendedUsers: Number(userStats.suspendedUsers),
    avgMechanicRating: userStats.avgMechanicRating ? parseFloat(String(userStats.avgMechanicRating)) : null,
    totalJobs: Number(jobStats.totalJobs),
    completedJobs: Number(jobStats.completedJobs),
    openJobs: Number(jobStats.openJobs),
    totalBids: Number(totalBids),
    totalMessages: Number(totalMessages),
    totalReports: Number(totalReports),
    unreviewedReports: Number(unreviewedReports),
  });
});

// GET /admin/users
router.get("/admin/users", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { role, search, showDeleted } = req.query as { role?: string; search?: string; showDeleted?: string };

  const conditions: ReturnType<typeof eq>[] = [eq(usersTable.isAdmin, false) as any];
  if (showDeleted !== "true") {
    conditions.push(isNull(usersTable.deletedAt) as any);
  }
  if (role === "customer" || role === "mechanic") {
    conditions.push(eq(usersTable.role, role) as any);
  }
  if (search) {
    conditions.push(or(
      ilike(usersTable.name, `%${search}%`),
      ilike(usersTable.email, `%${search}%`),
    ) as any);
  }

  const users = await db.select().from(usersTable)
    .where(and(...conditions))
    .orderBy(usersTable.createdAt);

  res.json(users.map(formatAdminUser));
});

// PATCH /admin/users/:id/suspend
router.patch("/admin/users/:id/suspend", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { suspended } = req.body;
  if (typeof suspended !== "boolean") { res.status(400).json({ error: "suspended must be boolean" }); return; }

  const [user] = await db.update(usersTable).set({ suspended }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  await logAdminAction(req.userId!, suspended ? "suspend_user" : "unsuspend_user", id, null, getClientIp(req));
  res.json(formatAdminUser(user));
});

// PATCH /admin/users/:id/ban
router.patch("/admin/users/:id/ban", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { banned } = req.body;
  if (typeof banned !== "boolean") { res.status(400).json({ error: "banned must be boolean" }); return; }

  const [user] = await db.update(usersTable).set({ banned }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  await logAdminAction(req.userId!, banned ? "ban_user" : "unban_user", id, null, getClientIp(req));
  req.log.warn({ adminId: req.userId, targetId: id, banned }, "Admin ban action");
  res.json(formatAdminUser(user));
});

// PATCH /admin/users/:id/notes
router.patch("/admin/users/:id/notes", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { notes } = req.body;
  if (typeof notes !== "string") { res.status(400).json({ error: "notes must be a string" }); return; }

  const [user] = await db.update(usersTable)
    .set({ adminNotes: notes.trim() || null })
    .where(eq(usersTable.id, id))
    .returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  await logAdminAction(req.userId!, "update_admin_notes", id, null, getClientIp(req));
  res.json(formatAdminUser(user));
});

// PATCH /admin/users/:id/verify
router.patch("/admin/users/:id/verify", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { verified } = req.body;
  if (typeof verified !== "boolean") { res.status(400).json({ error: "verified must be boolean" }); return; }

  const [user] = await db.update(usersTable).set({ verified }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  await logAdminAction(req.userId!, verified ? "verify_user" : "unverify_user", id, null, getClientIp(req));
  res.json(formatAdminUser(user));
});

// PATCH /admin/users/:id/flag
router.patch("/admin/users/:id/flag", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { flaggedForReview } = req.body;
  if (typeof flaggedForReview !== "boolean") { res.status(400).json({ error: "flaggedForReview must be boolean" }); return; }

  const [user] = await db.update(usersTable).set({ flaggedForReview }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  await logAdminAction(req.userId!, flaggedForReview ? "flag_user" : "unflag_user", id, null, getClientIp(req));
  res.json(formatAdminUser(user));
});

// PATCH /admin/users/:id/restore — undo soft delete
router.patch("/admin/users/:id/restore", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [user] = await db.update(usersTable).set({ deletedAt: null }).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  await logAdminAction(req.userId!, "restore_user", id, null, getClientIp(req));
  res.json(formatAdminUser(user));
});

// DELETE /admin/users/:id — soft delete
router.delete("/admin/users/:id", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  if (id === req.userId) {
    res.status(400).json({ error: "You cannot delete your own account" }); return;
  }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) { res.status(404).json({ error: "User not found" }); return; }

  if (target.isAdmin) {
    if (!req.body.confirmAdminDeletion) {
      res.status(400).json({ error: "Deleting an admin account requires confirmAdminDeletion: true" }); return;
    }
    const [{ adminCount }] = await db.select({ adminCount: count() })
      .from(usersTable)
      .where(and(eq(usersTable.isAdmin, true), isNull(usersTable.deletedAt)));
    if (Number(adminCount) <= 1) {
      res.status(400).json({ error: "Cannot delete the last admin account" }); return;
    }
  }

  await db.update(usersTable).set({ deletedAt: new Date() }).where(eq(usersTable.id, id));
  await logAdminAction(req.userId!, "delete_user", id, `name: ${target.name}, email: ${target.email}`, getClientIp(req));
  req.log.warn({ adminId: req.userId, targetId: id }, "Admin soft-deleted user");
  res.json({ message: "User deleted", userId: id });
});

// GET /admin/users/:id/reports
router.get("/admin/users/:id/reports", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const reports = await db.select().from(reportsTable)
    .where(or(eq(reportsTable.reportedUserId, id), eq(reportsTable.reporterId, id)))
    .orderBy(desc(reportsTable.createdAt));

  const result = await Promise.all(reports.map(async (r) => {
    const [reporter] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, r.reporterId));
    const [reported] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, r.reportedUserId));
    return {
      id: r.id,
      reporterId: r.reporterId,
      reporterName: reporter?.name ?? "Unknown",
      reportedUserId: r.reportedUserId,
      reportedUserName: reported?.name ?? "Unknown",
      reason: r.reason,
      details: r.details ?? null,
      reviewed: r.reviewed,
      resolution: r.resolution ?? null,
      jobId: r.jobId ?? null,
      createdAt: r.createdAt.toISOString(),
      isAboutUser: r.reportedUserId === id,
    };
  }));

  res.json(result);
});

// GET /admin/users/:id/ip-history
router.get("/admin/users/:id/ip-history", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const history = await db.select()
    .from(loginHistoryTable)
    .where(eq(loginHistoryTable.userId, id))
    .orderBy(desc(loginHistoryTable.createdAt))
    .limit(50);

  res.json(history.map(h => ({
    id: h.id,
    ip: h.ip,
    action: h.action,
    createdAt: h.createdAt.toISOString(),
  })));
});

// GET /admin/jobs
router.get("/admin/jobs", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { status } = req.query as { status?: string };

  const jobs = await db.select().from(jobsTable).orderBy(sql`${jobsTable.createdAt} desc`);
  const filtered = status ? jobs.filter(j => j.status === status) : jobs;

  const result = await Promise.all(filtered.map(async (job) => {
    const [customer] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, job.customerId));
    const [{ bidCount }] = await db.select({ bidCount: count() }).from(bidsTable).where(eq(bidsTable.jobId, job.id));
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      category: job.category,
      vehicleMake: job.vehicleMake,
      vehicleModel: job.vehicleModel,
      vehicleYear: job.vehicleYear,
      status: job.status,
      location: job.location,
      customerId: job.customerId,
      customerName: customer?.name ?? "Unknown",
      bidCount: Number(bidCount),
      createdAt: job.createdAt.toISOString(),
    };
  }));

  res.json(result);
});

// DELETE /admin/jobs/:id
router.delete("/admin/jobs/:id", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [job] = await db.update(jobsTable).set({ status: "cancelled" }).where(eq(jobsTable.id, id)).returning();
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  await logAdminAction(req.userId!, "cancel_job", null, `jobId: ${id}`, getClientIp(req));
  res.json({ message: "Job cancelled" });
});

// GET /admin/reports
router.get("/admin/reports", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { reviewed } = req.query as { reviewed?: string };

  const reports = await db.select().from(reportsTable).orderBy(sql`${reportsTable.createdAt} desc`);
  const filtered = reviewed !== undefined
    ? reports.filter(r => r.reviewed === (reviewed === "true"))
    : reports;

  const result = await Promise.all(filtered.map(async (r) => {
    const [reporter] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, r.reporterId));
    const [reported] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, r.reportedUserId));
    return {
      id: r.id,
      reporterId: r.reporterId,
      reporterName: reporter?.name ?? "Unknown",
      reportedUserId: r.reportedUserId,
      reportedUserName: reported?.name ?? "Unknown",
      reason: r.reason,
      details: r.details ?? null,
      reviewed: r.reviewed,
      resolution: r.resolution ?? null,
      jobId: r.jobId ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  }));

  res.json(result);
});

// PATCH /admin/reports/:id/review
router.patch("/admin/reports/:id/review", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { resolution } = req.body;
  if (!resolution) { res.status(400).json({ error: "resolution is required" }); return; }

  const [report] = await db.update(reportsTable)
    .set({ reviewed: true, resolution })
    .where(eq(reportsTable.id, id))
    .returning();

  if (!report) { res.status(404).json({ error: "Report not found" }); return; }

  const [reporter] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, report.reporterId));
  const [reported] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, report.reportedUserId));

  await logAdminAction(req.userId!, "review_report", report.reportedUserId, resolution, getClientIp(req));
  res.json({
    id: report.id,
    reporterId: report.reporterId,
    reporterName: reporter?.name ?? "Unknown",
    reportedUserId: report.reportedUserId,
    reportedUserName: reported?.name ?? "Unknown",
    reason: report.reason,
    details: report.details ?? null,
    reviewed: report.reviewed,
    resolution: report.resolution ?? null,
    jobId: report.jobId ?? null,
    createdAt: report.createdAt.toISOString(),
  });
});

// PATCH /admin/users/:id/mechanic-verification
router.patch("/admin/users/:id/mechanic-verification", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { identityVerificationStatus, adminVerifiedMechanic, verificationNotes } = req.body;
  const validStatuses = ["none", "pending", "approved", "rejected"];
  if (!identityVerificationStatus || !validStatuses.includes(identityVerificationStatus)) {
    res.status(400).json({ error: "Valid identityVerificationStatus is required" }); return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {
    identityVerificationStatus,
    verificationNotes: verificationNotes ?? null,
    adminVerifiedMechanic: typeof adminVerifiedMechanic === "boolean"
      ? adminVerifiedMechanic
      : identityVerificationStatus === "approved",
  };

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  await logAdminAction(req.userId!, `mechanic_verification_${identityVerificationStatus}`, id, null, getClientIp(req));
  res.json(formatAdminUser(user));
});

// GET /admin/ip-blocklist
router.get("/admin/ip-blocklist", requireAdmin, async (_req: AuthRequest, res): Promise<void> => {
  const list = await db.select().from(ipBlocklistTable).orderBy(desc(ipBlocklistTable.createdAt));

  const result = await Promise.all(list.map(async (entry) => {
    const [admin] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, entry.blockedById));
    return {
      id: entry.id,
      ip: entry.ip,
      reason: entry.reason ?? null,
      notes: entry.notes ?? null,
      blockedById: entry.blockedById,
      blockedByName: admin?.name ?? "Unknown",
      createdAt: entry.createdAt.toISOString(),
    };
  }));

  res.json(result);
});

// POST /admin/ip-blocklist
router.post("/admin/ip-blocklist", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { ip, reason, notes } = req.body;
  if (!ip || typeof ip !== "string") { res.status(400).json({ error: "IP address is required" }); return; }

  const cleaned = ip.trim();
  try {
    const [entry] = await db.insert(ipBlocklistTable).values({
      ip: cleaned,
      reason: reason ?? null,
      notes: notes ?? null,
      blockedById: req.userId!,
    }).returning();

    await logAdminAction(req.userId!, "block_ip", null, `ip: ${cleaned}${reason ? `, reason: ${reason}` : ""}`, getClientIp(req));

    const [admin] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.userId!));
    req.log.warn({ adminId: req.userId, ip: cleaned }, "Admin blocked IP");
    res.status(201).json({
      id: entry.id,
      ip: entry.ip,
      reason: entry.reason ?? null,
      notes: entry.notes ?? null,
      blockedById: entry.blockedById,
      blockedByName: admin?.name ?? "Unknown",
      createdAt: entry.createdAt.toISOString(),
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "This IP is already in the blocklist" }); return;
    }
    throw err;
  }
});

// DELETE /admin/ip-blocklist/:id
router.delete("/admin/ip-blocklist/:id", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [entry] = await db.delete(ipBlocklistTable).where(eq(ipBlocklistTable.id, id)).returning();
  if (!entry) { res.status(404).json({ error: "IP not found in blocklist" }); return; }

  await logAdminAction(req.userId!, "unblock_ip", null, `ip: ${entry.ip}`, getClientIp(req));
  res.json({ message: "IP unblocked", ip: entry.ip });
});

// GET /admin/audit-log
router.get("/admin/audit-log", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "100"), 10), 500);

  const entries = await db.select().from(adminAuditLogTable)
    .orderBy(desc(adminAuditLogTable.createdAt))
    .limit(limit);

  const result = await Promise.all(entries.map(async (e) => {
    const [admin] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, e.adminId));
    let targetUserName: string | null = null;
    if (e.targetUserId) {
      const [target] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, e.targetUserId));
      targetUserName = target?.name ?? null;
    }
    return {
      id: e.id,
      adminId: e.adminId,
      adminName: admin?.name ?? "Unknown",
      action: e.action,
      targetUserId: e.targetUserId ?? null,
      targetUserName,
      details: e.details ?? null,
      ip: e.ip ?? null,
      createdAt: e.createdAt.toISOString(),
    };
  }));

  res.json(result);
});

// GET /admin/referrals
router.get("/admin/referrals", requireAdmin, async (_req: AuthRequest, res): Promise<void> => {
  const mechanics = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    referralCode: usersTable.referralCode,
  }).from(usersTable)
    .where(and(eq(usersTable.role, "mechanic"), isNotNull(usersTable.referralCode)));

  const result = await Promise.all(mechanics.map(async (m) => {
    const [{ referralCount }] = await db.select({ referralCount: count() })
      .from(usersTable)
      .where(eq(usersTable.referredBy, m.referralCode!));
    return {
      mechanicId: m.id,
      mechanicName: m.name,
      email: m.email,
      referralCode: m.referralCode,
      referralCount: Number(referralCount),
    };
  }));

  result.sort((a, b) => b.referralCount - a.referralCount);
  res.json(result);
});

// PATCH /admin/users/:id/map-visible — toggle mechanic map visibility
router.patch("/admin/users/:id/map-visible", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { mapVisible } = req.body;
  if (typeof mapVisible !== "boolean") { res.status(400).json({ error: "mapVisible must be a boolean" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [updated] = await db.update(usersTable).set({ mapVisible }).where(eq(usersTable.id, id)).returning();
  const ip = getClientIp(req);
  void logAdminAction(req.userId!, "update_map_visible", id, `mapVisible=${mapVisible}`, Array.isArray(ip) ? ip[0] : ip);
  res.json(formatAdminUser(updated));
});

// PATCH /admin/jobs/:id/photos — overwrite the photos array (to remove individual photos)
router.patch("/admin/jobs/:id/photos", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const photos = req.body.photos;
  if (!Array.isArray(photos)) { res.status(400).json({ error: "photos must be an array" }); return; }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }

  const [updated] = await db.update(jobsTable)
    .set({ photos: photos.filter((p: unknown) => typeof p === "string") })
    .where(eq(jobsTable.id, id))
    .returning();

  const ip = getClientIp(req);
  void logAdminAction(req.userId!, "remove_job_photo", null, `job_id=${id}`, Array.isArray(ip) ? ip[0] : ip);
  res.json({ id: updated.id, photos: updated.photos });
});

export default router;
