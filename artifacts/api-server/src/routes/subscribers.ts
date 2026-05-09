import { Router, type IRouter } from "express";
import { eq, and, ilike, or } from "drizzle-orm";
import { db, subscribersTable, plansTable } from "@workspace/db";
import {
  ListSubscribersQueryParams,
  CreateSubscriberBody,
  GetSubscriberParams,
  UpdateSubscriberParams,
  UpdateSubscriberBody,
  DeleteSubscriberParams,
} from "@workspace/api-zod";
import { addDays } from "../lib/dateUtils.js";

const router: IRouter = Router();

async function formatSubscriber(s: typeof subscribersTable.$inferSelect) {
  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, s.planId));
  return {
    ...s,
    amount: parseFloat(s.amount),
    planName: plan?.name ?? "Unknown Plan",
    email: s.email ?? null,
    phone: s.phone ?? null,
    cpf: s.cpf ?? null,
    vehicleColor: s.vehicleColor ?? null,
    vehicleBrand: s.vehicleBrand ?? null,
    paymentMethod: s.paymentMethod ?? null,
    notes: s.notes ?? null,
  };
}

router.get("/subscribers", async (req, res): Promise<void> => {
  const query = ListSubscribersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let subs = await db
    .select()
    .from(subscribersTable)
    .orderBy(subscribersTable.name);

  if (query.data.status) {
    subs = subs.filter((s) => s.status === query.data.status);
  }

  if (query.data.search) {
    const search = query.data.search.toLowerCase();
    subs = subs.filter(
      (s) =>
        s.name.toLowerCase().includes(search) ||
        s.plate.toLowerCase().includes(search) ||
        (s.email?.toLowerCase().includes(search) ?? false)
    );
  }

  const planIds = [...new Set(subs.map((s) => s.planId))];
  const plans = planIds.length > 0
    ? await db.select().from(plansTable).where(
        planIds.length === 1
          ? eq(plansTable.id, planIds[0])
          : or(...planIds.map((id) => eq(plansTable.id, id)))
      )
    : [];
  const planMap = new Map(plans.map((p) => [p.id, p.name]));

  res.json(subs.map((s) => ({
    ...s,
    amount: parseFloat(s.amount),
    planName: planMap.get(s.planId) ?? "Unknown Plan",
    email: s.email ?? null,
    phone: s.phone ?? null,
    cpf: s.cpf ?? null,
    vehicleColor: s.vehicleColor ?? null,
    vehicleBrand: s.vehicleBrand ?? null,
    paymentMethod: s.paymentMethod ?? null,
    notes: s.notes ?? null,
  })));
});

router.post("/subscribers", async (req, res): Promise<void> => {
  const parsed = CreateSubscriberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, parsed.data.planId));
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  const startDate = parsed.data.startDate as string;
  const endDate = addDays(startDate, plan.durationDays);

  const [subscriber] = await db.insert(subscribersTable).values({
    ...parsed.data,
    endDate,
    amount: String(plan.price),
    status: "active",
  }).returning();

  res.status(201).json({
    ...subscriber,
    amount: parseFloat(subscriber.amount),
    planName: plan.name,
    email: subscriber.email ?? null,
    phone: subscriber.phone ?? null,
    cpf: subscriber.cpf ?? null,
    vehicleColor: subscriber.vehicleColor ?? null,
    vehicleBrand: subscriber.vehicleBrand ?? null,
    paymentMethod: subscriber.paymentMethod ?? null,
    notes: subscriber.notes ?? null,
  });
});

router.get("/subscribers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetSubscriberParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [sub] = await db.select().from(subscribersTable).where(eq(subscribersTable.id, params.data.id));
  if (!sub) {
    res.status(404).json({ error: "Subscriber not found" });
    return;
  }

  res.json(await formatSubscriber(sub));
});

router.patch("/subscribers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateSubscriberParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSubscriberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [subscriber] = await db
    .update(subscribersTable)
    .set(parsed.data)
    .where(eq(subscribersTable.id, params.data.id))
    .returning();

  if (!subscriber) {
    res.status(404).json({ error: "Subscriber not found" });
    return;
  }

  res.json(await formatSubscriber(subscriber));
});

router.delete("/subscribers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteSubscriberParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [sub] = await db.delete(subscribersTable).where(eq(subscribersTable.id, params.data.id)).returning();
  if (!sub) {
    res.status(404).json({ error: "Subscriber not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
