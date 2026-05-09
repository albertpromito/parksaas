import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, sessionsTable, spotsTable, transactionsTable } from "@workspace/db";
import {
  ListSessionsQueryParams,
  CreateSessionBody,
  GetSessionParams,
  UpdateSessionParams,
  UpdateSessionBody,
} from "@workspace/api-zod";
import { diffMinutes } from "../lib/dateUtils.js";
import { computePrice } from "../lib/pricingEngine.js";

const router: IRouter = Router();

function formatSession(s: typeof sessionsTable.$inferSelect, spotNumber?: string | null) {
  return {
    ...s,
    spotNumber: spotNumber ?? null,
    amount: s.amount !== null ? parseFloat(s.amount) : null,
    vehicleColor: s.vehicleColor ?? null,
    vehicleBrand: s.vehicleBrand ?? null,
    driverName: s.driverName ?? null,
    exitTime: s.exitTime ?? null,
    durationMinutes: s.durationMinutes ?? null,
    paymentMethod: s.paymentMethod ?? null,
    subscriberId: s.subscriberId ?? null,
    notes: s.notes ?? null,
    spotId: s.spotId ?? null,
  };
}

router.get("/sessions", async (req, res): Promise<void> => {
  const query = ListSessionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let conditions = [];
  if (query.data.status) conditions.push(eq(sessionsTable.status, query.data.status));

  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(sessionsTable.entryTime))
    .limit(query.data.limit ?? 50)
    .offset(query.data.offset ?? 0);

  let filtered = sessions;
  if (query.data.plate) {
    const plate = query.data.plate.toLowerCase();
    filtered = sessions.filter((s) => s.plate.toLowerCase().includes(plate));
  }

  const spotIds = [...new Set(filtered.filter((s) => s.spotId).map((s) => s.spotId!))];
  const spots = spotIds.length > 0
    ? await db.select().from(spotsTable).where(eq(spotsTable.id, spotIds[0]))
    : [];
  const spotMap = new Map(spots.map((s) => [s.id, s.number]));

  res.json(filtered.map((s) => formatSession(s, s.spotId ? spotMap.get(s.spotId) : null)));
});

router.post("/sessions", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db.insert(sessionsTable).values({
    ...parsed.data,
    status: "active",
    entryTime: new Date(),
  }).returning();

  if (session.spotId) {
    await db.update(spotsTable)
      .set({ status: "occupied", currentSessionId: session.id })
      .where(eq(spotsTable.id, session.spotId));
  }

  let spotNumber: string | null = null;
  if (session.spotId) {
    const [spot] = await db.select().from(spotsTable).where(eq(spotsTable.id, session.spotId));
    spotNumber = spot?.number ?? null;
  }

  res.status(201).json(formatSession(session, spotNumber));
});

router.get("/sessions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetSessionParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, params.data.id));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  let spotNumber: string | null = null;
  if (session.spotId) {
    const [spot] = await db.select().from(spotsTable).where(eq(spotsTable.id, session.spotId));
    spotNumber = spot?.number ?? null;
  }

  res.json(formatSession(session, spotNumber));
});

router.patch("/sessions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateSessionParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.status === "completed" || parsed.data.exitTime) {
    const exitTime = parsed.data.exitTime ? new Date(parsed.data.exitTime) : new Date();
    const entryTime = new Date(existing.entryTime);
    updateData.exitTime = exitTime;
    updateData.durationMinutes = diffMinutes(entryTime, exitTime);
    updateData.status = "completed";

    // Auto-calculate price from pricing rules if no amount was explicitly passed
    let finalAmount: number;
    if (parsed.data.amount !== undefined && parsed.data.amount !== null) {
      // Operator override — trust what was sent
      finalAmount = parsed.data.amount;
    } else {
      const priceResult = await computePrice(existing.vehicleType, entryTime, exitTime);
      finalAmount = priceResult.amount;
    }
    updateData.amount = String(finalAmount);

    // Free up the spot
    if (existing.spotId) {
      await db.update(spotsTable)
        .set({ status: "available", currentSessionId: null })
        .where(eq(spotsTable.id, existing.spotId));
    }

    // Record transaction
    if (finalAmount > 0) {
      await db.insert(transactionsTable).values({
        type: "session",
        referenceId: existing.id,
        description: `Estacionamento - Placa ${existing.plate}`,
        amount: String(finalAmount),
        paymentMethod: parsed.data.paymentMethod ?? null,
        plate: existing.plate,
        customerName: existing.driverName ?? null,
        date: new Date(),
      });
    }
  }

  if (parsed.data.amount !== undefined && parsed.data.status !== "completed" && !parsed.data.exitTime) {
    updateData.amount = String(parsed.data.amount);
  }

  const [session] = await db
    .update(sessionsTable)
    .set(updateData)
    .where(eq(sessionsTable.id, params.data.id))
    .returning();

  let spotNumber: string | null = null;
  if (session.spotId) {
    const [spot] = await db.select().from(spotsTable).where(eq(spotsTable.id, session.spotId));
    spotNumber = spot?.number ?? null;
  }

  res.json(formatSession(session, spotNumber));
});

export default router;
