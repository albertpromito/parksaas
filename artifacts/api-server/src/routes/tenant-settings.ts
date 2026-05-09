import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, tenantsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

// GET /api/tenant/access-pin/status
router.get("/tenant/access-pin/status", async (req, res): Promise<void> => {
  const tenantId = req.session.tenantId!;
  const [tenant] = await db
    .select({ accessPinHash: tenantsTable.accessPinHash })
    .from(tenantsTable)
    .where(eq(tenantsTable.id, tenantId));
  res.json({ hasPin: !!tenant?.accessPinHash });
});

// PUT /api/tenant/access-pin — set or change PIN
// body: { pin: string, currentPin?: string }
router.put("/tenant/access-pin", async (req, res): Promise<void> => {
  const tenantId = req.session.tenantId!;
  const parsed = z.object({
    pin: z.string().min(4, "A senha deve ter pelo menos 4 caracteres"),
    currentPin: z.string().optional(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" });
    return;
  }

  const [tenant] = await db
    .select({ accessPinHash: tenantsTable.accessPinHash })
    .from(tenantsTable)
    .where(eq(tenantsTable.id, tenantId));

  // If PIN already exists, require currentPin to change it
  if (tenant?.accessPinHash) {
    if (!parsed.data.currentPin) {
      res.status(400).json({ error: "Informe a senha atual para alterá-la" });
      return;
    }
    const ok = await bcrypt.compare(parsed.data.currentPin, tenant.accessPinHash);
    if (!ok) {
      res.status(401).json({ error: "Senha atual incorreta" });
      return;
    }
  }

  const accessPinHash = await bcrypt.hash(parsed.data.pin, 10);
  await db
    .update(tenantsTable)
    .set({ accessPinHash, updatedAt: new Date() })
    .where(eq(tenantsTable.id, tenantId));

  res.json({ hasPin: true });
});

// DELETE /api/tenant/access-pin — remove PIN (requires current PIN)
router.delete("/tenant/access-pin", async (req, res): Promise<void> => {
  const tenantId = req.session.tenantId!;
  const parsed = z.object({
    currentPin: z.string().min(1),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Informe a senha atual" });
    return;
  }

  const [tenant] = await db
    .select({ accessPinHash: tenantsTable.accessPinHash })
    .from(tenantsTable)
    .where(eq(tenantsTable.id, tenantId));

  if (!tenant?.accessPinHash) {
    res.json({ hasPin: false });
    return;
  }

  const ok = await bcrypt.compare(parsed.data.currentPin, tenant.accessPinHash);
  if (!ok) {
    res.status(401).json({ error: "Senha atual incorreta" });
    return;
  }

  await db
    .update(tenantsTable)
    .set({ accessPinHash: null, updatedAt: new Date() })
    .where(eq(tenantsTable.id, tenantId));

  res.json({ hasPin: false });
});

// POST /api/tenant/verify-access-pin — verify PIN for guard
router.post("/tenant/verify-access-pin", async (req, res): Promise<void> => {
  const tenantId = req.session.tenantId!;
  const parsed = z.object({ pin: z.string() }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos" });
    return;
  }

  const [tenant] = await db
    .select({ accessPinHash: tenantsTable.accessPinHash })
    .from(tenantsTable)
    .where(eq(tenantsTable.id, tenantId));

  if (!tenant?.accessPinHash) {
    res.json({ valid: true });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.pin, tenant.accessPinHash);
  res.json({ valid });
});

export default router;
