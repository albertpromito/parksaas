import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, tenantsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const ADMIN_EMAIL = "tuliaodesigner@gmail.com";
const ADMIN_PASSWORD_HASH = "$2b$12$5xVPe6jY6O3IfDYtB7fD..84xKUVmm4OpPA7t5rtN0jnY7B5UxNkC";

const LoginBody = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

// POST /api/auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Usuário e senha são obrigatórios" });
    return;
  }

  const { identifier, password } = parsed.data;

  // Check master admin (email-based login)
  if (identifier.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!ok) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }
    req.session.role = "admin";
    req.session.tenantId = null;
    req.session.tenantEmail = identifier;
    req.session.tenantName = "Administrador";
    req.session.parkingName = null;

    req.session.save((err) => {
      if (err) {
        req.log.error({ err }, "Session save failed for admin");
        res.status(500).json({ error: "Erro ao criar sessão" });
        return;
      }
      res.json({ role: "admin", name: "Administrador", email: identifier });
    });
    return;
  }

  // Check tenant by username
  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.username, identifier.toLowerCase()));
  if (!tenant) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  const ok = await bcrypt.compare(password, tenant.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  if (!tenant.isActive) {
    res.status(403).json({ error: "Sua conta está suspensa. Entre em contato com o suporte." });
    return;
  }

  req.session.role = "tenant";
  req.session.tenantId = tenant.id;
  req.session.tenantEmail = tenant.email;
  req.session.tenantName = tenant.name;
  req.session.parkingName = tenant.parkingName;

  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "Erro ao criar sessão" });
      return;
    }
    res.json({
      role: "tenant",
      tenantId: tenant.id,
      name: tenant.name,
      email: tenant.email,
      parkingName: tenant.parkingName,
    });
  });
});

// POST /api/auth/logout
router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.clearCookie("parkhub_sid");
    res.json({ ok: true });
  });
});

// GET /api/auth/me
router.get("/auth/me", (req, res): void => {
  if (!req.session?.role) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  res.json({
    role: req.session.role,
    tenantId: req.session.tenantId ?? null,
    name: req.session.tenantName,
    email: req.session.tenantEmail,
    parkingName: req.session.parkingName ?? null,
  });
});

export default router;
