import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const tenantsTable = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  parkingName: text("parking_name").notNull(),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  accessPinHash: text("access_pin_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
