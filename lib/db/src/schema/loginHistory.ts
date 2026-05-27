import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const loginHistoryTable = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  ip: text("ip").notNull(),
  action: text("action").notNull().default("login"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
