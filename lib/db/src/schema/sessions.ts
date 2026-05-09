import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  spotId: integer("spot_id"),
  plate: text("plate").notNull(),
  vehicleType: text("vehicle_type").notNull().default("car"),
  vehicleColor: text("vehicle_color"),
  vehicleBrand: text("vehicle_brand"),
  driverName: text("driver_name"),
  entryTime: timestamp("entry_time", { withTimezone: true }).notNull().defaultNow(),
  exitTime: timestamp("exit_time", { withTimezone: true }),
  durationMinutes: integer("duration_minutes"),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  paymentMethod: text("payment_method"),
  status: text("status").notNull().default("active"), // active, completed, cancelled
  isSubscriber: boolean("is_subscriber").notNull().default(false),
  subscriberId: integer("subscriber_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
