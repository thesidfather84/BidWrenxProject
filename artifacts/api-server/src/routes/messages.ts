import { Router, type IRouter } from "express";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { db, messagesTable, usersTable, jobsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import { getPublicName } from "./auth";

const router: IRouter = Router();

const PHONE_PATTERN = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const CIRCUMVENTION_KEYWORDS = /\b(cash\s*app|venmo|zelle|paypal|cashapp|whatsapp|telegram|snapchat)\b/i;

function containsContactInfo(text: string): boolean {
  return PHONE_PATTERN.test(text) || CIRCUMVENTION_KEYWORDS.test(text);
}

router.get("/messages/threads", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const msgs = await db.select().from(messagesTable)
    .where(or(eq(messagesTable.senderId, userId), eq(messagesTable.recipientId, userId)))
    .orderBy(desc(messagesTable.createdAt));

  const threadMap = new Map<string, typeof msgs[0]>();
  for (const msg of msgs) {
    const otherId = msg.senderId === userId ? msg.recipientId : msg.senderId;
    const key = `${msg.jobId}:${otherId}`;
    if (!threadMap.has(key)) threadMap.set(key, msg);
  }

  const threads = await Promise.all(Array.from(threadMap.entries()).map(async ([, msg]) => {
    const otherId = msg.senderId === userId ? msg.recipientId : msg.senderId;
    const [otherUser] = await db.select().from(usersTable).where(eq(usersTable.id, otherId));
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, msg.jobId));
    const unread = msgs.filter(m =>
      m.jobId === msg.jobId && m.senderId === otherId && m.recipientId === userId
    ).length;
    return {
      jobId: msg.jobId,
      jobTitle: job?.title ?? "Unknown job",
      otherUserId: otherId,
      otherUserName: otherUser ? getPublicName(otherUser) : "Unknown",
      lastMessage: msg.content,
      lastMessageAt: msg.createdAt.toISOString(),
      unreadCount: unread,
    };
  }));

  res.json(threads);
});

router.get("/messages/threads/:jobId/:otherUserId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const rawJob = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const rawOther = Array.isArray(req.params.otherUserId) ? req.params.otherUserId[0] : req.params.otherUserId;
  const jobId = parseInt(rawJob, 10);
  const otherUserId = parseInt(rawOther, 10);
  if (isNaN(jobId) || isNaN(otherUserId)) { res.status(400).json({ error: "Invalid params" }); return; }

  const msgs = await db.select().from(messagesTable)
    .where(and(
      eq(messagesTable.jobId, jobId),
      or(
        and(eq(messagesTable.senderId, userId), eq(messagesTable.recipientId, otherUserId)),
        and(eq(messagesTable.senderId, otherUserId), eq(messagesTable.recipientId, userId))
      )
    ))
    .orderBy(messagesTable.createdAt);

  const results = await Promise.all(msgs.map(async (msg) => {
    const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, msg.senderId));
    return {
      id: msg.id, jobId: msg.jobId, senderId: msg.senderId,
      senderName: sender ? getPublicName(sender) : "Unknown", recipientId: msg.recipientId,
      content: msg.content, createdAt: msg.createdAt.toISOString(),
    };
  }));

  res.json(results);
});

router.post("/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { jobId, recipientId, content } = req.body;
  if (!jobId || !recipientId || !content) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  if (containsContactInfo(content)) {
    await db.update(usersTable)
      .set({ warningCount: sql`${usersTable.warningCount} + 1` })
      .where(eq(usersTable.id, req.userId!));

    res.status(422).json({
      error: "circumvention_detected",
      message: "For your safety and account protection, keep communication and payments on BidWrenx until the job is accepted.",
    });
    return;
  }

  const isFlagged = containsContactInfo(content);
  const [msg] = await db.insert(messagesTable).values({
    jobId: Number(jobId), senderId: req.userId!,
    recipientId: Number(recipientId), content, flagged: isFlagged,
  }).returning();

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, msg.senderId));
  res.status(201).json({
    id: msg.id, jobId: msg.jobId, senderId: msg.senderId,
    senderName: sender ? getPublicName(sender) : "Unknown", recipientId: msg.recipientId,
    content: msg.content, createdAt: msg.createdAt.toISOString(),
  });
});

export default router;
