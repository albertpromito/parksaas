import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, pricingRulesTable, pricingSettingsTable } from "@workspace/db";
import { z } from "zod";
import { formatRule, computePrice } from "../lib/pricingEngine.js";

const router: IRouter = Router();

const PricingRuleBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  vehicleTypes: z.array(z.string()).min(1),
  rateType: z.enum(["hourly", "per_minute", "per_block"]),
  rateValue: z.number().min(0),
  blockMinutes: z.number().int().min(1).optional().default(60),
  gracePeriodMinutes: z.number().int().min(0).default(0),
  minimumMinutes: z.number().int().min(0).default(0),
  minimumCharge: z.number().min(0).optional(),
  maxDailyCharge: z.number().min(0).optional(),
  roundUpBlock: z.boolean().default(true),
  timeFrom: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timeTo: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  priority: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const CalculateBody = z.object({
  vehicleType: z.string(),
  entryTime: z.string(),
  exitTime: z.string(),
});

// GET /pricing-rules
router.get("/pricing-rules", async (req, res): Promise<void> => {
  const rules = await db.select().from(pricingRulesTable).orderBy(desc(pricingRulesTable.priority), pricingRulesTable.id);
  res.json(rules.map(formatRule));
});

// POST /pricing-rules
router.post("/pricing-rules", async (req, res): Promise<void> => {
  const parsed = PricingRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [rule] = await db.insert(pricingRulesTable).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    vehicleTypes: parsed.data.vehicleTypes,
    rateType: parsed.data.rateType,
    rateValue: String(parsed.data.rateValue),
    blockMinutes: parsed.data.blockMinutes,
    gracePeriodMinutes: parsed.data.gracePeriodMinutes,
    minimumMinutes: parsed.data.minimumMinutes,
    minimumCharge: parsed.data.minimumCharge !== undefined ? String(parsed.data.minimumCharge) : null,
    maxDailyCharge: parsed.data.maxDailyCharge !== undefined ? String(parsed.data.maxDailyCharge) : null,
    roundUpBlock: parsed.data.roundUpBlock,
    timeFrom: parsed.data.timeFrom ?? null,
    timeTo: parsed.data.timeTo ?? null,
    daysOfWeek: parsed.data.daysOfWeek ?? null,
    priority: parsed.data.priority,
    isActive: parsed.data.isActive,
  }).returning();

  res.status(201).json(formatRule(rule));
});

// PATCH /pricing-rules/:id
router.patch("/pricing-rules/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = PricingRuleBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.name !== undefined) updateData.name = d.name;
  if (d.description !== undefined) updateData.description = d.description;
  if (d.vehicleTypes !== undefined) updateData.vehicleTypes = d.vehicleTypes;
  if (d.rateType !== undefined) updateData.rateType = d.rateType;
  if (d.rateValue !== undefined) updateData.rateValue = String(d.rateValue);
  if (d.blockMinutes !== undefined) updateData.blockMinutes = d.blockMinutes;
  if (d.gracePeriodMinutes !== undefined) updateData.gracePeriodMinutes = d.gracePeriodMinutes;
  if (d.minimumMinutes !== undefined) updateData.minimumMinutes = d.minimumMinutes;
  if (d.minimumCharge !== undefined) updateData.minimumCharge = d.minimumCharge !== null ? String(d.minimumCharge) : null;
  if (d.maxDailyCharge !== undefined) updateData.maxDailyCharge = d.maxDailyCharge !== null ? String(d.maxDailyCharge) : null;
  if (d.roundUpBlock !== undefined) updateData.roundUpBlock = d.roundUpBlock;
  if (d.timeFrom !== undefined) updateData.timeFrom = d.timeFrom ?? null;
  if (d.timeTo !== undefined) updateData.timeTo = d.timeTo ?? null;
  if (d.daysOfWeek !== undefined) updateData.daysOfWeek = d.daysOfWeek ?? null;
  if (d.priority !== undefined) updateData.priority = d.priority;
  if (d.isActive !== undefined) updateData.isActive = d.isActive;

  const [rule] = await db.update(pricingRulesTable).set(updateData).where(eq(pricingRulesTable.id, id)).returning();
  if (!rule) {
    res.status(404).json({ error: "Rule not found" });
    return;
  }
  res.json(formatRule(rule));
});

// DELETE /pricing-rules/:id
router.delete("/pricing-rules/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(pricingRulesTable).where(eq(pricingRulesTable.id, id));
  res.status(204).send();
});

// POST /pricing/calculate — simulate price (also used by sessions preview)
router.post("/pricing/calculate", async (req, res): Promise<void> => {
  const parsed = CalculateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const entryTime = new Date(parsed.data.entryTime);
  const exitTime = new Date(parsed.data.exitTime);
  const result = await computePrice(parsed.data.vehicleType, entryTime, exitTime);

  res.json({
    vehicleType: parsed.data.vehicleType,
    entryTime: parsed.data.entryTime,
    exitTime: parsed.data.exitTime,
    ...result,
  });
});

// GET /pricing-settings
router.get("/pricing-settings", async (req, res): Promise<void> => {
  const settings = await db.select().from(pricingSettingsTable);
  res.json(settings);
});

// PATCH /pricing-settings
router.patch("/pricing-settings", async (req, res): Promise<void> => {
  const updates = req.body as Array<{ key: string; value: string }>;
  if (!Array.isArray(updates)) {
    res.status(400).json({ error: "Expected array of {key, value}" });
    return;
  }

  for (const u of updates) {
    await db.update(pricingSettingsTable).set({ value: u.value }).where(eq(pricingSettingsTable.key, u.key));
  }

  const settings = await db.select().from(pricingSettingsTable);
  res.json(settings);
});

export default router;
