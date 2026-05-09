import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pricingRulesTable = pgTable("pricing_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),

  vehicleTypes: text("vehicle_types").array().notNull().default(["car"]),

  rateType: text("rate_type").notNull().default("hourly"),
  rateValue: numeric("rate_value", { precision: 10, scale: 2 }).notNull(),
  blockMinutes: integer("block_minutes").default(60),

  gracePeriodMinutes: integer("grace_period_minutes").notNull().default(0),
  minimumMinutes: integer("minimum_minutes").notNull().default(0),
  minimumCharge: numeric("minimum_charge", { precision: 10, scale: 2 }),
  maxDailyCharge: numeric("max_daily_charge", { precision: 10, scale: 2 }),
  roundUpBlock: boolean("round_up_block").notNull().default(true),

  timeFrom: text("time_from"),
  timeTo: text("time_to"),

  daysOfWeek: integer("days_of_week").array(),

  priority: integer("priority").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPricingRuleSchema = createInsertSchema(pricingRulesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPricingRule = z.infer<typeof insertPricingRuleSchema>;
export type PricingRule = typeof pricingRulesTable.$inferSelect;

export const pricingSettingsTable = pgTable("pricing_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  type: text("type").notNull().default("string"),
});

export type PricingSetting = typeof pricingSettingsTable.$inferSelect;
