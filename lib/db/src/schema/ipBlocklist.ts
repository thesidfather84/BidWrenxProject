import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const ipBlocklistTable = pgTable("ip_blocklist", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull().unique(),
  reason: text("reason"),
  notes: text("notes"),
  blockedById: integer("blocked_by_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
