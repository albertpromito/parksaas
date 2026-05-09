# ParkHub — Sistema de Gestão de Estacionamentos

## Overview

SaaS parking management system in Brazilian Portuguese. pnpm monorepo with Express API, React+Vite frontend, PostgreSQL database. Now with multi-tenant auth and master admin panel.

## Stack

- **Frontend**: React + Vite + Wouter + TanStack Query + shadcn/ui + Recharts
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL + express-session + bcryptjs
- **Validation**: Zod, drizzle-zod
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec`)
- **Theme**: Traffic Yellow (#EAB308) primary, dark asphalt sidebar, full dark mode

## Artifacts

- `artifacts/parking-saas` — React frontend at `/`
- `artifacts/api-server` — Express API at `/api`

## Pages

- `/` Dashboard — KPIs, revenue trend chart, occupancy by type, recent activity
- `/spots` Vagas — Spot grid with status, filters, add/edit status dialogs
- `/sessions` Movimentos — Entry/exit flow, auto-calculated pricing, active/completed tabs
- `/subscribers` Mensalistas — Monthly subscribers with expiry warnings, search, add/cancel
- `/plans` Planos — Subscription plan cards with edit/delete
- `/transactions` Financeiro — Transaction list with totals, filter by type/payment/date
- `/reports` Relatórios — Revenue & occupancy analytics with charts
- `/pricing` Preços — Pricing rules CRUD + price simulator
- `/access-control` Controle de Acesso — PIN/senha para proteger Dashboard, Financeiro e Relatórios

## Auth

- **Login page** — shown when no session exists (all roles)
- **Master admin**: `tuliaodesigner@gmail.com` / `Coxinha123` → sees Admin Panel (no Layout)
- **Tenants**: created by admin → see main app with sidebar
- **Session**: express-session + connect-pg-simple → `user_sessions` table (7-day cookie `parkhub_sid`)
- **Protected routes**: all `/api` routes except `/api/auth/*` require valid session
- **Suspended tenants**: blocked at login with error message; existing session still valid until cleared

## Key Files

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/api-zod/src/generated/api.ts` — Generated Zod schemas
- `lib/api-client-react/src/generated/api.ts` — Generated React Query hooks
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middleware/auth.ts` — requireAuth / requireAdmin / requireActiveTenant
- `artifacts/api-server/src/routes/auth.ts` — login/logout/me
- `artifacts/api-server/src/routes/admin.ts` — tenant CRUD (admin only)
- `artifacts/api-server/src/lib/pricingEngine.ts` — shared pricing calculation logic
- `artifacts/parking-saas/src/contexts/auth-context.tsx` — AuthProvider + useAuth
- `artifacts/parking-saas/src/pages/` — All frontend pages
- `lib/db/src/schema/tenants.ts` — Tenant table schema

## Architecture Decisions

- `lib/api-zod/src/index.ts` must only export `export * from "./generated/api"` (NOT types subfolder)
- `lib/api-spec/orval.config.ts` — `schemas` field removed from zod output to avoid duplicates
- Reports routes use local string-based Zod schemas (not generated) since generated ones use `z.date()`
- Session exit automatically creates a transaction and frees the spot, price auto-computed via pricingEngine
- Tenant suspension blocks login but doesn't invalidate existing sessions (by design — sessions expire in 7 days)
- Admin panel and main app share the same SPA; routing is determined by `user.role` in AuthProvider

## Key Commands

- `pnpm run typecheck` — full typecheck
- `pnpm --filter @workspace/api-spec run codegen` — regenerate hooks and schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes

## Gotchas

- `user_sessions` table must exist in DB (created manually; `createTableIfMissing: true` is a fallback)
- Always call `req.session.save(cb)` before sending response after setting session data
- Admin password hash is hardcoded in `auth.ts` — change it by running `bcrypt.hash('newpass', 12)` from `artifacts/api-server/`
