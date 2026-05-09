import { Router, type IRouter } from "express";
import { and, gte, lte } from "drizzle-orm";
import { db, transactionsTable, spotsTable, expensesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

function startOf(date: Date, unit: "day" | "month"): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (unit === "month") d.setDate(1);
  return d;
}

const sum = (arr: { amount: string }[]) =>
  arr.reduce((s, t) => s + parseFloat(t.amount), 0);

const r2 = (n: number) => Math.round(n * 100) / 100;

// GET /finance/executive
router.get("/finance/executive", async (req, res): Promise<void> => {
  const now = new Date();
  const todayStart = startOf(now, "day");
  const monthStart = startOf(now, "month");
  const prevMonthStart = new Date(monthStart);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
  const prevMonthEnd = new Date(monthStart);
  prevMonthEnd.setMilliseconds(-1);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  const sixtyDaysAgo = new Date(thirtyDaysAgo);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 30);

  const [todayTxns, monthTxns, prevMonthTxns, last30, prior30, spotsRow] = await Promise.all([
    db.select().from(transactionsTable).where(gte(transactionsTable.date, todayStart)),
    db.select().from(transactionsTable).where(gte(transactionsTable.date, monthStart)),
    db.select().from(transactionsTable).where(and(gte(transactionsTable.date, prevMonthStart), lte(transactionsTable.date, prevMonthEnd))),
    db.select().from(transactionsTable).where(gte(transactionsTable.date, thirtyDaysAgo)),
    db.select().from(transactionsTable).where(and(gte(transactionsTable.date, sixtyDaysAgo), lte(transactionsTable.date, thirtyDaysAgo))),
    db.select({ total: sql<number>`count(*)::int`, occupied: sql<number>`count(*) filter (where status = 'occupied')::int` }).from(spotsTable),
  ]);

  const todayRevenue = sum(todayTxns);
  const monthRevenue = sum(monthTxns);
  const prevMonthRevenue = sum(prevMonthTxns);
  const spots = spotsRow[0];

  const methodMap = new Map<string, { amount: number; count: number }>();
  for (const t of monthTxns) {
    const m = t.paymentMethod ?? "other";
    if (!methodMap.has(m)) methodMap.set(m, { amount: 0, count: 0 });
    const e = methodMap.get(m)!;
    e.amount += parseFloat(t.amount);
    e.count += 1;
  }

  const trendMap = new Map<string, { revenue: number; prevRevenue: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    trendMap.set(d.toISOString().split("T")[0], { revenue: 0, prevRevenue: 0 });
  }
  for (const t of last30) {
    const key = new Date(t.date).toISOString().split("T")[0];
    const e = trendMap.get(key);
    if (e) e.revenue += parseFloat(t.amount);
  }
  for (const t of prior30) {
    const d = new Date(t.date);
    d.setDate(d.getDate() + 30);
    const key = d.toISOString().split("T")[0];
    const e = trendMap.get(key);
    if (e) e.prevRevenue += parseFloat(t.amount);
  }

  const occupancyRate = (spots?.total ?? 0) > 0 ? Math.round(((spots?.occupied ?? 0) / spots!.total) * 100) : 0;

  res.json({
    today: {
      revenue: r2(todayRevenue),
      transactions: todayTxns.length,
      avgTicket: todayTxns.length > 0 ? r2(todayRevenue / todayTxns.length) : 0,
    },
    month: {
      revenue: r2(monthRevenue),
      transactions: monthTxns.length,
      avgTicket: monthTxns.length > 0 ? r2(monthRevenue / monthTxns.length) : 0,
    },
    prevMonth: {
      revenue: r2(prevMonthRevenue),
      transactions: prevMonthTxns.length,
    },
    occupancyRate,
    totalSpots: spots?.total ?? 0,
    occupiedSpots: spots?.occupied ?? 0,
    byPaymentMethod: Array.from(methodMap.entries()).map(([method, data]) => ({
      method,
      amount: r2(data.amount),
      count: data.count,
      pct: monthRevenue > 0 ? Math.round((data.amount / monthRevenue) * 100) : 0,
    })),
    revenueByType: [
      { type: "session", label: "Sessões avulsas", amount: r2(monthTxns.filter((t) => t.type === "session").reduce((s, t) => s + parseFloat(t.amount), 0)) },
      { type: "subscription", label: "Mensalidades", amount: r2(monthTxns.filter((t) => t.type === "subscription").reduce((s, t) => s + parseFloat(t.amount), 0)) },
      { type: "fine", label: "Multas", amount: r2(monthTxns.filter((t) => t.type === "fine").reduce((s, t) => s + parseFloat(t.amount), 0)) },
    ],
    trend: Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, revenue: r2(data.revenue), prevRevenue: r2(data.prevRevenue) })),
  });
});

// GET /finance/cashflow
router.get("/finance/cashflow", async (req, res): Promise<void> => {
  const Params = z.object({ dateFrom: z.string().optional(), dateTo: z.string().optional() });
  const query = Params.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }

  const now = new Date();
  const dateFrom = query.data.dateFrom ? new Date(query.data.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  dateFrom.setHours(0, 0, 0, 0);
  const dateTo = query.data.dateTo ? new Date(query.data.dateTo) : new Date();
  dateTo.setHours(23, 59, 59, 999);

  const txns = await db.select().from(transactionsTable).where(and(gte(transactionsTable.date, dateFrom), lte(transactionsTable.date, dateTo)));

  const dayMap = new Map<string, { sessions: number; subscriptions: number; fines: number; total: number; count: number }>();
  const d = new Date(dateFrom);
  while (d <= dateTo) {
    dayMap.set(d.toISOString().split("T")[0], { sessions: 0, subscriptions: 0, fines: 0, total: 0, count: 0 });
    d.setDate(d.getDate() + 1);
  }

  for (const t of txns) {
    const key = new Date(t.date).toISOString().split("T")[0];
    const e = dayMap.get(key);
    if (!e) continue;
    const amount = parseFloat(t.amount);
    e.total += amount;
    e.count += 1;
    if (t.type === "session") e.sessions += amount;
    else if (t.type === "subscription") e.subscriptions += amount;
    else e.fines += amount;
  }

  let running = 0;
  const period = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => {
      running += data.total;
      return { date, sessions: r2(data.sessions), subscriptions: r2(data.subscriptions), fines: r2(data.fines), total: r2(data.total), count: data.count, running: r2(running) };
    });

  const methodMap = new Map<string, { amount: number; count: number }>();
  for (const t of txns) {
    const m = t.paymentMethod ?? "other";
    if (!methodMap.has(m)) methodMap.set(m, { amount: 0, count: 0 });
    const e = methodMap.get(m)!;
    e.amount += parseFloat(t.amount);
    e.count += 1;
  }

  const totalInflow = sum(txns);

  res.json({
    period,
    totalInflow: r2(totalInflow),
    totalTransactions: txns.length,
    avgDaily: period.length > 0 ? r2(totalInflow / period.filter((p) => p.total > 0).length || 1) : 0,
    byMethod: Array.from(methodMap.entries()).map(([method, data]) => ({
      method,
      amount: r2(data.amount),
      count: data.count,
      pct: totalInflow > 0 ? Math.round((data.amount / totalInflow) * 100) : 0,
    })),
  });
});

// GET /finance/heatmap
router.get("/finance/heatmap", async (req, res): Promise<void> => {
  const weeks = Math.min(52, Math.max(1, parseInt(String(req.query.weeks ?? "8"), 10)));
  const from = new Date();
  from.setDate(from.getDate() - weeks * 7);
  from.setHours(0, 0, 0, 0);

  const txns = await db.select().from(transactionsTable).where(gte(transactionsTable.date, from));

  const matrix: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const counts: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));

  for (const t of txns) {
    const dt = new Date(t.date);
    matrix[dt.getDay()][dt.getHours()] += parseFloat(t.amount);
    counts[dt.getDay()][dt.getHours()] += 1;
  }

  res.json({
    data: matrix.flatMap((row, dow) =>
      row.map((value, hour) => ({ dayOfWeek: dow, hour, value: r2(value), count: counts[dow][hour] }))
    ),
  });
});

// GET /finance/dre
router.get("/finance/dre", async (req, res): Promise<void> => {
  const Params = z.object({ dateFrom: z.string().optional(), dateTo: z.string().optional() });
  const query = Params.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }

  const now = new Date();
  const dateFrom = query.data.dateFrom ? new Date(query.data.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  dateFrom.setHours(0, 0, 0, 0);
  const dateTo = query.data.dateTo ? new Date(query.data.dateTo) : new Date();
  dateTo.setHours(23, 59, 59, 999);

  const [txns, expenses] = await Promise.all([
    db.select().from(transactionsTable).where(and(gte(transactionsTable.date, dateFrom), lte(transactionsTable.date, dateTo))),
    db.select().from(expensesTable).where(and(gte(expensesTable.date, dateFrom), lte(expensesTable.date, dateTo))),
  ]);

  const sessionTxns = txns.filter((t) => t.type === "session");
  const subscriptionTxns = txns.filter((t) => t.type === "subscription");
  const fineTxns = txns.filter((t) => t.type === "fine");

  const sessionRevenue = r2(sum(sessionTxns));
  const subscriptionRevenue = r2(sum(subscriptionTxns));
  const fineRevenue = r2(sum(fineTxns));
  const grossRevenue = r2(sessionRevenue + subscriptionRevenue + fineRevenue);

  const methodMap = new Map<string, number>();
  for (const t of txns) {
    const m = t.paymentMethod ?? "other";
    methodMap.set(m, (methodMap.get(m) ?? 0) + parseFloat(t.amount));
  }

  // Expenses grouped by category
  const expCatMap = new Map<string, number>();
  for (const e of expenses) {
    const cat = e.category;
    expCatMap.set(cat, (expCatMap.get(cat) ?? 0) + parseFloat(e.amount));
  }
  const expensesByCategory = Object.fromEntries(
    Array.from(expCatMap.entries()).map(([k, v]) => [k, r2(v)])
  );
  const totalExpenses = r2(expenses.reduce((s, e) => s + parseFloat(e.amount), 0));
  const netResult = r2(grossRevenue - totalExpenses);

  // Split into operational costs vs admin expenses
  const operationalCats = ["maintenance", "utilities"];
  const adminCats = ["personnel", "rent", "taxes", "marketing", "other"];
  const operationalCosts = r2(operationalCats.reduce((s, c) => s + (expensesByCategory[c] ?? 0), 0));
  const adminExpenses = r2(adminCats.reduce((s, c) => s + (expensesByCategory[c] ?? 0), 0));

  res.json({
    period: { from: dateFrom.toISOString().split("T")[0], to: dateTo.toISOString().split("T")[0] },
    grossRevenue,
    sessionRevenue,
    subscriptionRevenue,
    fineRevenue,
    totalTransactions: txns.length,
    sessionCount: sessionTxns.length,
    subscriptionCount: subscriptionTxns.length,
    fineCount: fineTxns.length,
    avgTicket: txns.length > 0 ? r2(grossRevenue / txns.length) : 0,
    byPaymentMethod: Array.from(methodMap.entries()).map(([method, amount]) => ({
      method,
      amount: r2(amount),
      pct: grossRevenue > 0 ? Math.round((amount / grossRevenue) * 100) : 0,
    })),
    totalExpenses,
    expensesByCategory,
    operationalCosts,
    adminExpenses,
    netResult,
  });
});

export default router;
