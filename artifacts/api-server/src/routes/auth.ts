import { Router, type IRouter } from "express";
import { eq, sql, desc, isNull, count, and } from "drizzle-orm";
import { db, usersTable, reportsTable, loginHistoryTable, jobsTable, bidsTable } from "@workspace/db";
import { hashPassword, verifyPassword, generateToken, hashPin } from "../lib/auth";
import { requireAuth, requireFullAuth, type AuthRequest } from "../middlewares/requireAuth";
import { checkIpBlocked } from "../middlewares/checkIpBlocked";
import { getClientIp } from "../lib/getIp";

const router: IRouter = Router();

function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function getUniqueReferralCode(): Promise<string> {
  for (let attempts = 0; attempts < 10; attempts++) {
    const code = generateReferralCode();
    const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.referralCode, code));
    if (!existing) return code;
  }
  return generateReferralCode() + Date.now().toString(36).toUpperCase().slice(-3);
}

/** Returns the name to display publicly for a user.
 *  Priority: displayName → username → name (only if showLegalNamePublicly=true) → "Member #id"
 *  Legal name (name column) is only exposed when the user has explicitly opted in. */
export function getPublicName(user: typeof usersTable.$inferSelect): string {
  if (user.displayName) return user.displayName;
  if (user.username) return user.username;
  if (user.showLegalNamePublicly) return user.name;
  return `Member #${user.id}`;
}

export function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? null,
    location: user.location ?? null,
    bio: user.bio ?? null,
    rating: user.rating ?? null,
    reviewCount: user.reviewCount,
    warningCount: user.warningCount,
    flaggedForReview: user.flaggedForReview,
    suspended: user.suspended,
    banned: user.banned,
    verified: user.verified,
    isAdmin: user.isAdmin,
    mustChangePassword: user.mustChangePassword,
    hasPinSet: !!user.pinHash,
    pinLocked: !!user.pinLockedAt,
    photoUrl: user.photoUrl ?? null,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    identityVerificationStatus: user.identityVerificationStatus,
    insuranceDocumentUploaded: !!user.insuranceDocumentPath,
    certificationDocumentUploaded: !!user.certificationDocumentPath,
    adminVerifiedMechanic: user.adminVerifiedMechanic,
    verificationNotes: user.verificationNotes ?? null,
    verificationRequestedAt: user.verificationRequestedAt ? user.verificationRequestedAt.toISOString() : null,
    termsAcceptedAt: user.termsAcceptedAt ? user.termsAcceptedAt.toISOString() : null,
    referralCode: user.referralCode ?? null,
    specialties: user.specialties ?? null,
    // Identity / privacy
    legalName: user.legalName ?? null,
    displayName: user.displayName ?? null,
    username: user.username ?? null,
    showLegalNamePublicly: user.showLegalNamePublicly,
    // Map presence
    mapCity: user.mapCity ?? null,
    mapState: user.mapState ?? null,
    mapLat: user.mapLat ?? null,
    mapLng: user.mapLng ?? null,
    serviceRadiusMiles: user.serviceRadiusMiles,
    isMobileMechanic: user.isMobileMechanic,
    shopType: user.shopType,
    willingToTravelMiles: user.willingToTravelMiles ?? null,
    emergencyAvailable: user.emergencyAvailable,
    mapVisible: user.mapVisible,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/auth/register", checkIpBlocked, async (req, res): Promise<void> => {
  const { name, email, password, role, termsAccepted, referralCode: inboundReferralCode } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }
  if (!["customer", "mechanic"].includes(role)) {
    res.status(400).json({ error: "Invalid role" }); return;
  }
  if (!termsAccepted) {
    res.status(400).json({ error: "You must accept the Terms of Service and Disclaimer to create an account" }); return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already in use" }); return;
  }

  const ip = getClientIp(req);
  const passwordHash = hashPassword(password);

  // Generate referral code for new mechanics
  let newReferralCode: string | null = null;
  if (role === "mechanic") {
    newReferralCode = await getUniqueReferralCode();
  }

  // Validate inbound referral code (the code used to sign up)
  let referredBy: string | null = null;
  if (inboundReferralCode && typeof inboundReferralCode === "string") {
    const [referrer] = await db.select({ referralCode: usersTable.referralCode })
      .from(usersTable)
      .where(eq(usersTable.referralCode, inboundReferralCode.toUpperCase().trim()));
    if (referrer) referredBy = inboundReferralCode.toUpperCase().trim();
  }

  const [user] = await db.insert(usersTable).values({
    name, email, passwordHash, role,
    termsAcceptedAt: new Date(),
    signupIp: ip,
    ...(newReferralCode && { referralCode: newReferralCode }),
    ...(referredBy && { referredBy }),
  }).returning();

  // Record signup in login history
  await db.insert(loginHistoryTable).values({ userId: user.id, ip, action: "register" }).catch(() => {});

  const token = generateToken(user.id, user.role);
  req.log.info({ userId: user.id }, "User registered");
  res.status(201).json({ user: formatUser(user), token });
});

router.post("/auth/login", checkIpBlocked, async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Missing credentials" }); return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid credentials" }); return;
  }
  if (user.banned) {
    res.status(403).json({ error: "Your account has been banned. Contact support for assistance." }); return;
  }
  if (user.suspended) {
    res.status(403).json({ error: "Your account has been suspended. Please contact support." }); return;
  }

  const ip = getClientIp(req);

  // Successful full login: reset any PIN lockout, capture IP
  await db.update(usersTable)
    .set({ pinAttempts: 0, pinLockedAt: null, lastLoginIp: ip })
    .where(eq(usersTable.id, user.id));

  // Record in login history (fire and forget)
  await db.insert(loginHistoryTable).values({ userId: user.id, ip, action: "login" }).catch(() => {});

  const token = generateToken(user.id, user.role, "full");
  req.log.info({ userId: user.id }, "User logged in");
  res.json({ user: formatUser(user), token });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ message: "Logged out" });
});

router.get("/auth/has-pin", async (req, res): Promise<void> => {
  const email = typeof req.query.email === "string" ? req.query.email.toLowerCase().trim() : "";
  if (!email) { res.status(400).json({ error: "Email required" }); return; }

  const [user] = await db.select({
    pinHash: usersTable.pinHash,
    pinLockedAt: usersTable.pinLockedAt,
  }).from(usersTable).where(eq(usersTable.email, email));

  res.json({
    hasPinSet: !!(user?.pinHash),
    pinLocked: !!(user?.pinLockedAt),
  });
});

router.post("/auth/pin-login", checkIpBlocked, async (req, res): Promise<void> => {
  const { email, pin } = req.body;
  if (!email || !pin) { res.status(400).json({ error: "Email and PIN required" }); return; }
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    res.status(400).json({ error: "PIN must be 4 digits" }); return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, String(email).toLowerCase().trim()));
  if (!user || !user.pinHash) {
    res.status(401).json({ error: "No PIN configured for this account" }); return;
  }
  if (user.banned) {
    res.status(403).json({ error: "Your account has been banned. Contact support for assistance." }); return;
  }
  if (user.suspended) {
    res.status(403).json({ error: "Account suspended. Please contact support." }); return;
  }
  if (user.pinLockedAt) {
    res.status(403).json({ error: "PIN locked after too many failed attempts. Sign in with your password to unlock." }); return;
  }

  if (hashPin(pin, user.email) !== user.pinHash) {
    const newAttempts = user.pinAttempts + 1;
    const locked = newAttempts >= 5;
    await db.update(usersTable)
      .set({ pinAttempts: newAttempts, pinLockedAt: locked ? new Date() : null })
      .where(eq(usersTable.id, user.id));
    if (locked) {
      res.status(403).json({ error: "Too many failed attempts. PIN locked. Sign in with your password to unlock." }); return;
    }
    const remaining = 5 - newAttempts;
    res.status(401).json({ error: `Incorrect PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` }); return;
  }

  const ip = getClientIp(req);
  await db.update(usersTable).set({ pinAttempts: 0, lastLoginIp: ip }).where(eq(usersTable.id, user.id));
  await db.insert(loginHistoryTable).values({ userId: user.id, ip, action: "pin_login" }).catch(() => {});

  const token = generateToken(user.id, user.role, "pin");
  req.log.info({ userId: user.id }, "User logged in via PIN");
  res.json({ user: formatUser(user), token });
});

router.post("/users/me/pin", requireAuth, requireFullAuth, async (req: AuthRequest, res): Promise<void> => {
  const { pin, currentPassword } = req.body;
  if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    res.status(400).json({ error: "PIN must be exactly 4 digits" }); return;
  }
  if (!currentPassword) {
    res.status(400).json({ error: "Current password is required to set a PIN" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    res.status(400).json({ error: "Incorrect password" }); return;
  }
  const [updated] = await db.update(usersTable)
    .set({ pinHash: hashPin(pin, user.email), pinAttempts: 0, pinLockedAt: null })
    .where(eq(usersTable.id, user.id))
    .returning();
  req.log.info({ userId: req.userId }, "PIN set");
  res.json(formatUser(updated));
});

router.delete("/users/me/pin", requireAuth, requireFullAuth, async (req: AuthRequest, res): Promise<void> => {
  const { currentPassword } = req.body;
  if (!currentPassword) {
    res.status(400).json({ error: "Current password is required" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    res.status(400).json({ error: "Incorrect password" }); return;
  }
  const [updated] = await db.update(usersTable)
    .set({ pinHash: null, pinAttempts: 0, pinLockedAt: null })
    .where(eq(usersTable.id, user.id))
    .returning();
  req.log.info({ userId: req.userId }, "PIN removed");
  res.json(formatUser(updated));
});

router.patch("/users/me/password", requireAuth, requireFullAuth, async (req: AuthRequest, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" }); return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (!user.mustChangePassword) {
    if (!currentPassword) {
      res.status(400).json({ error: "Current password is required" }); return;
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      res.status(400).json({ error: "Current password is incorrect" }); return;
    }
  }

  const [updated] = await db.update(usersTable)
    .set({ passwordHash: hashPassword(newPassword), mustChangePassword: false })
    .where(eq(usersTable.id, req.userId!))
    .returning();

  req.log.info({ userId: req.userId }, "Password changed");
  res.json(formatUser(updated));
});

// GET /users/check-username?username=xxx — live availability check; requires auth
router.get("/users/check-username", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = typeof req.query.username === "string" ? req.query.username.trim() : "";
  if (!raw) { res.json({ available: false, error: "Username is required" }); return; }

  if (raw.includes("@") || /^[^@]+@[^@]+\.[^@]+$/.test(raw)) {
    res.json({ available: false, error: "Username cannot contain @ or look like an email address" }); return;
  }
  if (/^[\d\s\-.()+]+$/.test(raw)) {
    res.json({ available: false, error: "Username cannot look like a phone number" }); return;
  }

  const cleaned = raw.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 30);

  if (cleaned.length < 3) {
    res.json({ available: false, error: "Username must be at least 3 characters" }); return;
  }
  const RESERVED = ["admin", "bidwrenx", "support", "moderator", "mod", "help", "staff", "official", "root", "system", "api", "null", "undefined", "contact", "legal", "privacy", "terms", "billing"];
  if (RESERVED.includes(cleaned) || RESERVED.some((r) => cleaned.startsWith(r + "_") || cleaned.startsWith(r + "."))) {
    res.json({ available: false, error: "That username is reserved — please choose another" }); return;
  }
  const OFFENSIVE = ["fuck", "shit", "bitch", "cunt", "dick", "cock", "pussy", "nigger", "nigga", "faggot", "retard", "slut", "whore"];
  if (OFFENSIVE.some((w) => cleaned.includes(w))) {
    res.json({ available: false, error: "Username contains prohibited content" }); return;
  }

  const [existing] = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.username, cleaned), sql`id != ${req.userId}`));

  res.json({ available: !existing, cleaned, ...(existing ? { error: "That username is already taken" } : {}) });
});

// PATCH /users/me/identity — update displayName, username, legalName, showLegalNamePublicly
router.patch("/users/me/identity", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { displayName, username, legalName, showLegalNamePublicly } = req.body;

  const updates: Partial<typeof usersTable.$inferInsert> = {};

  if (displayName !== undefined) {
    updates.displayName = displayName ? String(displayName).trim().slice(0, 60) || null : null;
  }
  if (legalName !== undefined) {
    updates.legalName = legalName ? String(legalName).trim().slice(0, 100) || null : null;
  }
  if (showLegalNamePublicly !== undefined) {
    updates.showLegalNamePublicly = Boolean(showLegalNamePublicly);
  }
  if (username !== undefined) {
    const raw = username ? String(username).trim() : null;

    if (raw) {
      // Validate raw input BEFORE sanitization
      if (raw.includes("@") || /^[^@]+@[^@]+\.[^@]+$/.test(raw)) {
        res.status(400).json({ error: "Username cannot contain @ or look like an email address" }); return;
      }
      // Reject phone-like inputs (digits, spaces, dashes, parens, plus)
      if (/^[\d\s\-.()+]+$/.test(raw)) {
        res.status(400).json({ error: "Username cannot look like a phone number" }); return;
      }

      const cleaned = raw.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 30);

      // Minimum length after cleaning
      if (cleaned.length < 3) {
        res.status(400).json({ error: "Username must be at least 3 characters" }); return;
      }
      // Reserved words
      const RESERVED = ["admin", "bidwrenx", "support", "moderator", "mod", "help", "staff", "official", "root", "system", "api", "null", "undefined", "contact", "legal", "privacy", "terms", "billing"];
      if (RESERVED.includes(cleaned) || RESERVED.some((r) => cleaned.startsWith(r + "_") || cleaned.startsWith(r + "."))) {
        res.status(400).json({ error: "That username is reserved — please choose another" }); return;
      }
      // Offensive / harmful word filter (basic denylist)
      const OFFENSIVE = ["fuck", "shit", "ass", "bitch", "cunt", "dick", "cock", "pussy", "nigger", "nigga", "faggot", "retard", "slut", "whore"];
      if (OFFENSIVE.some((w) => cleaned.includes(w))) {
        res.status(400).json({ error: "Username contains prohibited content" }); return;
      }

      // Check uniqueness
      const [existing] = await db.select({ id: usersTable.id })
        .from(usersTable)
        .where(and(eq(usersTable.username, cleaned), sql`id != ${req.userId}`));
      if (existing) {
        res.status(409).json({ error: "That username is already taken" }); return;
      }

      updates.username = cleaned;
    } else {
      updates.username = null;
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" }); return;
  }

  const [updated] = await db.update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.userId!))
    .returning();

  req.log.info({ userId: req.userId }, "Identity updated");
  res.json(formatUser(updated));
});

router.post("/users/:id/report", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const reportedUserId = parseInt(raw, 10);
  if (isNaN(reportedUserId)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const { reason, details, jobId } = req.body;
  if (!reason) { res.status(400).json({ error: "Reason is required" }); return; }

  const validReasons = ["circumvention", "harassment", "fraud", "spam", "other"];
  if (!validReasons.includes(reason)) { res.status(400).json({ error: "Invalid reason" }); return; }

  const [report] = await db.insert(reportsTable).values({
    reporterId: req.userId!,
    reportedUserId,
    reason,
    details: details ?? null,
    jobId: jobId ? Number(jobId) : null,
  }).returning();

  if (reason === "circumvention") {
    await db.update(usersTable)
      .set({ warningCount: sql`${usersTable.warningCount} + 1` })
      .where(eq(usersTable.id, reportedUserId));
    const [target] = await db.select().from(usersTable).where(eq(usersTable.id, reportedUserId));
    if (target && target.warningCount >= 2) {
      await db.update(usersTable).set({ flaggedForReview: true }).where(eq(usersTable.id, reportedUserId));
    }
  }

  req.log.warn({ reporterId: req.userId, reportedUserId, reason }, "User reported");
  res.status(201).json({
    id: report.id,
    reportedUserId: report.reportedUserId,
    reason: report.reason,
    details: report.details ?? null,
    createdAt: report.createdAt.toISOString(),
  });
});

// GET /users/me/referral — must be before /users/:id/profile
router.get("/users/me/referral", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (user.role !== "mechanic") {
    res.status(400).json({ error: "Referral codes are only available for mechanics" }); return;
  }

  let referralCode = user.referralCode;
  if (!referralCode) {
    const code = await getUniqueReferralCode();
    const [updated] = await db.update(usersTable)
      .set({ referralCode: code })
      .where(eq(usersTable.id, user.id))
      .returning();
    referralCode = updated.referralCode;
  }

  const referredUsers = await db.select({
    name: usersTable.name,
    displayName: usersTable.displayName,
    username: usersTable.username,
    joinedAt: usersTable.createdAt,
  }).from(usersTable)
    .where(eq(usersTable.referredBy, referralCode!))
    .orderBy(desc(usersTable.createdAt))
    .limit(50);

  res.json({
    referralCode,
    referralCount: referredUsers.length,
    referredUsers: referredUsers.map(u => ({
      name: u.displayName ?? u.username ?? u.name,
      joinedAt: u.joinedAt.toISOString(),
    })),
  });
});

router.get("/users/:id/profile", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user id" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  res.json({
    id: user.id,
    name: getPublicName(user),
    role: user.role,
    bio: user.bio ?? null,
    location: user.location ?? null,
    rating: user.rating ?? null,
    reviewCount: user.reviewCount,
    photoUrl: user.photoUrl ?? null,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    identityVerificationStatus: user.identityVerificationStatus,
    insuranceDocumentUploaded: !!user.insuranceDocumentPath,
    certificationDocumentUploaded: !!user.certificationDocumentPath,
    adminVerifiedMechanic: user.adminVerifiedMechanic,
    verificationNotes: user.adminVerifiedMechanic ? (user.verificationNotes ?? null) : null,
    createdAt: user.createdAt.toISOString(),
  });
});

// GET /mechanic/:id/public-profile
router.get("/mechanic/:id/public-profile", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [user] = await db.select().from(usersTable)
    .where(and(eq(usersTable.id, id), eq(usersTable.role, "mechanic"), isNull(usersTable.deletedAt)));
  if (!user) { res.status(404).json({ error: "Mechanic not found" }); return; }

  const [{ completedJobs }] = await db.select({ completedJobs: count() })
    .from(bidsTable)
    .innerJoin(jobsTable, eq(jobsTable.id, bidsTable.jobId))
    .where(and(
      eq(bidsTable.mechanicId, id),
      eq(bidsTable.status, "accepted"),
      eq(jobsTable.status, "completed"),
    ));

  const badges: string[] = [];
  if (user.adminVerifiedMechanic) badges.push("Verified Pro");
  if (user.rating && user.rating >= 4.5 && user.reviewCount >= 10) badges.push("Top Rated");
  if (Number(completedJobs) >= 20) badges.push("Experienced");

  res.json({
    id: user.id,
    name: getPublicName(user),
    bio: user.bio ?? null,
    location: user.location ?? null,
    rating: user.rating ?? null,
    reviewCount: user.reviewCount,
    photoUrl: user.photoUrl ?? null,
    specialties: user.specialties ?? null,
    adminVerifiedMechanic: user.adminVerifiedMechanic,
    completedJobs: Number(completedJobs),
    referralCode: user.referralCode ?? null,
    badges,
    createdAt: user.createdAt.toISOString(),
  });
});

// POST /auth/fix-admins — one-time admin account repair; gated by ADMIN_SETUP_KEY env var
// Set ADMIN_SETUP_KEY secret, call once, then clear the secret to disable permanently.
router.post("/auth/fix-admins", async (req, res): Promise<void> => {
  const setupKey = process.env.ADMIN_SETUP_KEY;
  if (!setupKey) {
    res.status(404).json({ error: "Not found" }); return;
  }
  const provided = req.headers["x-admin-setup-key"] ?? req.body?.key;
  if (provided !== setupKey) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  // Fix bidwrenx@gmail.com — set is_admin=true without changing role
  await db.execute(sql`
    UPDATE users
    SET is_admin = true
    WHERE email = 'bidwrenx@gmail.com'
  `);

  // Ensure admin@bidwrenx.com exists — generate a secure random one-time password
  const [existing] = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, "admin@bidwrenx.com"));

  let generatedPassword: string | null = null;
  if (!existing) {
    // Random 16-char password — caller MUST change it immediately after use
    const { randomBytes } = await import("node:crypto");
    generatedPassword = randomBytes(12).toString("base64url");
    const h = hashPassword(generatedPassword);
    await db.execute(sql`
      INSERT INTO users (name, email, password_hash, role, is_admin, terms_accepted_at)
      VALUES ('BidWrenx Admin', 'admin@bidwrenx.com', ${h}, 'customer', true, now())
    `);
  }

  res.json({
    ok: true,
    message: "Admin accounts fixed",
    ...(generatedPassword ? { adminPassword: generatedPassword, warning: "Change this password immediately — it will not be shown again" } : {}),
  });
});

// POST /auth/seed-demo — one-time demo data seed; only works when the DB is empty
router.post("/auth/seed-demo", async (req, res): Promise<void> => {
  const [{ total }] = await db.select({ total: count() }).from(usersTable);
  if (Number(total) > 0) {
    res.status(409).json({ error: "Database already has users — seed skipped" });
    return;
  }

  const h = hashPassword("password123");

  // Insert customers and mechanics via Drizzle (typed)
  await db.insert(usersTable).values([
    { name: "Sarah Johnson",  email: "sarah@example.com", passwordHash: h, role: "customer", location: "Austin, TX", termsAcceptedAt: new Date() },
    { name: "James Wilson",   email: "james@example.com", passwordHash: h, role: "customer", location: "Dallas, TX", termsAcceptedAt: new Date() },
    { name: "Mike Rodriguez", email: "mike@example.com",  passwordHash: h, role: "mechanic", location: "Austin, TX", bio: "10+ years specializing in brakes, engine, and transmission. ASE Certified.", rating: 4.9, reviewCount: 127, referralCode: "MIKE1234", termsAcceptedAt: new Date(), verified: true, adminVerifiedMechanic: true },
    { name: "David Chen",     email: "david@example.com", passwordHash: h, role: "mechanic", location: "Austin, TX", bio: "European and Asian vehicle specialist. Electrical and diagnostics expert.", rating: 4.7, reviewCount: 89,  referralCode: "DAVE5678", termsAcceptedAt: new Date(), verified: true, adminVerifiedMechanic: true },
    { name: "Luis Martinez",  email: "luis@example.com",  passwordHash: h, role: "mechanic", location: "Austin, TX", bio: "AC, suspension, and general repair. Quick turnaround guaranteed.", rating: 4.5, reviewCount: 64,  referralCode: "LUIS9012", termsAcceptedAt: new Date(), verified: true, adminVerifiedMechanic: true },
  ]);

  // Insert admins via raw SQL (role enum doesn't include "admin" in Drizzle types but exists in DB)
  await db.execute(sql`
    INSERT INTO users (name, email, password_hash, role, is_admin, terms_accepted_at)
    VALUES
      ('BidWrenx Admin', 'admin@bidwrenx.com', ${h}, 'customer', true, now()),
      ('Sidney Admin',   'bidwrenx@gmail.com',  ${h}, 'customer', true, now())
  `);

  req.log.info("Demo seed complete");
  res.json({ ok: true, message: "Demo accounts created" });
});

export default router;
