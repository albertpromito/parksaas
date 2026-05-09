import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, spotsTable } from "@workspace/db";
import {
  ListSpotsQueryParams,
  CreateSpotBody,
  GetSpotParams,
  UpdateSpotParams,
  UpdateSpotBody,
  DeleteSpotParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/spots", async (req, res): Promise<void> => {
  const query = ListSpotsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let conditions = [];
  if (query.data.status) conditions.push(eq(spotsTable.status, query.data.status));
  if (query.data.type) conditions.push(eq(spotsTable.type, query.data.type));

  const spots = await db
    .select()
    .from(spotsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(spotsTable.number);

  res.json(spots.map((s) => ({
    ...s,
    currentSessionId: s.currentSessionId ?? null,
    notes: s.notes ?? null,
  })));
});

router.post("/spots", async (req, res): Promise<void> => {
  const parsed = CreateSpotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [spot] = await db.insert(spotsTable).values(parsed.data).returning();
  res.status(201).json({ ...spot, currentSessionId: spot.currentSessionId ?? null, notes: spot.notes ?? null });
});

router.get("/spots/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetSpotParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [spot] = await db.select().from(spotsTable).where(eq(spotsTable.id, params.data.id));
  if (!spot) {
    res.status(404).json({ error: "Spot not found" });
    return;
  }

  res.json({ ...spot, currentSessionId: spot.currentSessionId ?? null, notes: spot.notes ?? null });
});

router.patch("/spots/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateSpotParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSpotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [spot] = await db
    .update(spotsTable)
    .set(parsed.data)
    .where(eq(spotsTable.id, params.data.id))
    .returning();

  if (!spot) {
    res.status(404).json({ error: "Spot not found" });
    return;
  }

  res.json({ ...spot, currentSessionId: spot.currentSessionId ?? null, notes: spot.notes ?? null });
});

router.delete("/spots/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteSpotParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [spot] = await db.delete(spotsTable).where(eq(spotsTable.id, params.data.id)).returning();
  if (!spot) {
    res.status(404).json({ error: "Spot not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
