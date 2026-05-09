import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, plansTable, subscribersTable } from "@workspace/db";
import {
  CreatePlanBody,
  UpdatePlanParams,
  UpdatePlanBody,
  DeletePlanParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/plans", async (_req, res): Promise<void> => {
  const plans = await db.select().from(plansTable).orderBy(plansTable.name);

  const counts = await db
    .select({ planId: subscribersTable.planId, count: sql<number>`count(*)::int` })
    .from(subscribersTable)
    .where(eq(subscribersTable.status, "active"))
    .groupBy(subscribersTable.planId);

  const countMap = new Map(counts.map((c) => [c.planId, c.count]));

  res.json(plans.map((p) => ({
    ...p,
    price: parseFloat(p.price),
    vehicleTypes: p.vehicleTypes ?? [],
    description: p.description ?? null,
    subscriberCount: countMap.get(p.id) ?? 0,
  })));
});

router.post("/plans", async (req, res): Promise<void> => {
  const parsed = CreatePlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [plan] = await db.insert(plansTable).values({
    ...parsed.data,
    price: String(parsed.data.price),
    isActive: parsed.data.isActive ?? true,
  }).returning();

  res.status(201).json({ ...plan, price: parseFloat(plan.price), vehicleTypes: plan.vehicleTypes ?? [], description: plan.description ?? null, subscriberCount: 0 });
});

router.patch("/plans/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdatePlanParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.price !== undefined) updateData.price = String(parsed.data.price);

  const [plan] = await db.update(plansTable).set(updateData).where(eq(plansTable.id, params.data.id)).returning();
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subscribersTable)
    .where(eq(subscribersTable.planId, plan.id));

  res.json({ ...plan, price: parseFloat(plan.price), vehicleTypes: plan.vehicleTypes ?? [], description: plan.description ?? null, subscriberCount: countRow?.count ?? 0 });
});

router.delete("/plans/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeletePlanParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [plan] = await db.delete(plansTable).where(eq(plansTable.id, params.data.id)).returning();
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
