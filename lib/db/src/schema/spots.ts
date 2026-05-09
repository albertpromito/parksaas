import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const spotsTable = pgTable("spots", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  type: text("type").notNull().default("standard"), // standard, handicapped, vip, motorcycle, large
  status: text("status").notNull().default("available"), // available, occupied, reserved, maintenance
  floor: text("floor").notNull().default("1"),
  section: text("section").notNull().default("A"),
  notes: text("notes"),
  currentSessionId: integer("current_session_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSpotSchema = createInsertSchema(spotsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSpot = z.infer<typeof insertSpotSchema>;
export type Spot = typeof spotsTable.$inferSelect;
