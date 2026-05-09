import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, desc, sql } from "drizzle-orm";
import { db, tenantsTable } from "@workspace/db";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth.js";

const router: IRouter = Router();

const CreateTenantBody = z.object({
  name: z.string().min(1),
  username: z.string().min(3).regex(/^[a-z0-9_.-]+$/, "Usuário deve conter apenas letras minúsculas, números, _ . ou -"),
  password: z.string().min(6),
  parkingName: z.string().min(1),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

const UpdateTenantBody = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(3).regex(/^[a-z0-9_.-]+$/, "Usuário deve conter apenas letras minúsculas, números, _ . ou -").optional(),
  password: z.string().min(6).optional(),
  parkingName: z.string().min(1).optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

function formatTenant(t: typeof tenantsTable.$inferSelect) {
  const { passwordHash: _, ...safe } = t;
  return safe;
}

// GET /api/admin/tenants
router.get("/admin/tenants", requireAdmin, async (req, res): Promise<void> => {
  const tenants = await db.select().from(tenantsTable).orderBy(desc(tenantsTable.createdAt));
  res.json(tenants.map(formatTenant));
});

// POST /api/admin/tenants
router.post("/admin/tenants", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateTenantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? parsed.error.message });
    return;
  }

  const usernameLC = parsed.data.username.toLowerCase();

  const existing = await db.select().from(tenantsTable).where(eq(tenantsTable.username, usernameLC));
  if (existing.length > 0) {
    res.status(409).json({ error: "Já existe um cadastro com este nome de usuário" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  // email is required in DB (NOT NULL) but tenants no longer use it for login;
  // store a placeholder derived from username to satisfy the constraint
  const emailPlaceholder = `${usernameLC}@parkhub.local`;

  const [tenant] = await db.insert(tenantsTable).values({
    name: parsed.data.name,
    username: usernameLC,
    email: emailPlaceholder,
    passwordHash,
    parkingName: parsed.data.parkingName,
    phone: parsed.data.phone ?? null,
    notes: parsed.data.notes ?? null,
    isActive: true,
  }).returning();

  res.status(201).json(formatTenant(tenant));
});

// PATCH /api/admin/tenants/:id
router.patch("/admin/tenants/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = UpdateTenantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  const d = parsed.data;

  if (d.name !== undefined) updateData.name = d.name;
  if (d.username !== undefined) {
    const usernameLC = d.username.toLowerCase();
    updateData.username = usernameLC;
    updateData.email = `${usernameLC}@parkhub.local`;
  }
  if (d.parkingName !== undefined) updateData.parkingName = d.parkingName;
  if (d.phone !== undefined) updateData.phone = d.phone;
  if (d.notes !== undefined) updateData.notes = d.notes;
  if (d.isActive !== undefined) updateData.isActive = d.isActive;
  if (d.password !== undefined) updateData.passwordHash = await bcrypt.hash(d.password, 12);

  const [tenant] = await db.update(tenantsTable).set(updateData).where(eq(tenantsTable.id, id)).returning();
  if (!tenant) {
    res.status(404).json({ error: "Cadastro não encontrado" });
    return;
  }

  // When suspending, immediately invalidate all active sessions for this tenant
  if (d.isActive === false) {
    await db.execute(sql`DELETE FROM user_sessions WHERE sess->>'tenantId' = ${id.toString()}`);
  }

  res.json(formatTenant(tenant));
});

// DELETE /api/admin/tenants/:id
router.delete("/admin/tenants/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  // Invalidate all active sessions for this tenant before deleting
  await db.execute(sql`DELETE FROM user_sessions WHERE sess->>'tenantId' = ${id.toString()}`);
  await db.delete(tenantsTable).where(eq(tenantsTable.id, id));
  res.status(204).send();
});

export default router;
