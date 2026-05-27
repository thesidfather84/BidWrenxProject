import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull(),
  reportedUserId: integer("reported_user_id").notNull(),
  jobId: integer("job_id"),
  reason: text("reason").notNull(),
  details: text("details"),
  reviewed: boolean("reviewed").notNull().default(false),
  resolution: text("resolution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
