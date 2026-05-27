import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const adminAuditLogTable = pgTable("admin_audit_log", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull(),
  action: text("action").notNull(),
  targetUserId: integer("target_user_id"),
  details: text("details"),
  ip: text("ip"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
