import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.role) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.role !== "admin") {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }
  next();
}

export function requireActiveTenant(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.role) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  // Admin always passes through
  if (req.session.role === "admin") {
    next();
    return;
  }
  // Tenant must have an id (isActive check is done at login time)
  if (req.session.role === "tenant" && req.session.tenantId) {
    next();
    return;
  }
  res.status(403).json({ error: "Acesso negado" });
}
