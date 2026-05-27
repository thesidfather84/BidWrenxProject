import { pgTable, text, serial, timestamp, real, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { jobsTable } from "./jobs";

export const bidStatusEnum = pgEnum("bid_status", ["pending", "accepted", "rejected", "withdrawn"]);

export const bidsTable = pgTable("bids", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobsTable.id),
  mechanicId: integer("mechanic_id").notNull().references(() => usersTable.id),
  amount: real("amount").notNull(),
  estimatedDays: integer("estimated_days").notNull(),
  note: text("note"),
  status: bidStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBidSchema = createInsertSchema(bidsTable).omit({ id: true, createdAt: true, status: true });
export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bidsTable.$inferSelect;
