import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { db, spotsTable, sessionsTable, subscribersTable, transactionsTable } from "@workspace/db";

const router: IRouter = Router();

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);

  const [spots] = await db.select({
    total: sql<number>`count(*)::int`,
    occupied: sql<number>`count(*) filter (where status = 'occupied')::int`,
    available: sql<number>`count(*) filter (where status = 'available')::int`,
  }).from(spotsTable);

  const [activeSessions] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(sessionsTable).where(eq(sessionsTable.status, "active"));

  const [activeSubscribers] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(subscribersTable).where(eq(subscribersTable.status, "active"));

  // Expiring subscribers in next 7 days
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const todayStr = now.toISOString().split("T")[0];
  const sevenDaysStr = sevenDaysFromNow.toISOString().split("T")[0];

  const [expiringSubscribers] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(subscribersTable).where(
    and(
      eq(subscribersTable.status, "active"),
      gte(subscribersTable.endDate, todayStr),
      lte(subscribersTable.endDate, sevenDaysStr)
    )
  );

  const [todayRevenue] = await db.select({
    total: sql<number>`coalesce(sum(amount::numeric), 0)::float`,
  }).from(transactionsTable).where(gte(transactionsTable.date, todayStart));

  const [monthRevenue] = await db.select({
    total: sql<number>`coalesce(sum(amount::numeric), 0)::float`,
  }).from(transactionsTable).where(gte(transactionsTable.date, monthStart));

  const [todaySessions] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(sessionsTable).where(gte(sessionsTable.entryTime, todayStart));

  const [monthSessions] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(sessionsTable).where(gte(sessionsTable.entryTime, monthStart));

  const totalSpots = spots?.total ?? 0;
  const occupiedSpots = spots?.occupied ?? 0;

  res.json({
    totalSpots,
    occupiedSpots,
    availableSpots: spots?.available ?? 0,
    occupancyRate: totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0,
    activeSessionsCount: activeSessions?.count ?? 0,
    activeSubscribersCount: activeSubscribers?.count ?? 0,
    todayRevenue: todayRevenue?.total ?? 0,
    monthRevenue: monthRevenue?.total ?? 0,
    todaySessions: todaySessions?.count ?? 0,
    monthSessions: monthSessions?.count ?? 0,
    expiringSubscribersCount: expiringSubscribers?.count ?? 0,
  });
});

router.get("/dashboard/occupancy", async (_req, res): Promise<void> => {
  const types = ["standard", "handicapped", "vip", "motorcycle", "large"];
  const result = await Promise.all(
    types.map(async (type) => {
      const [row] = await db.select({
        total: sql<number>`count(*)::int`,
        occupied: sql<number>`count(*) filter (where status = 'occupied')::int`,
        available: sql<number>`count(*) filter (where status = 'available')::int`,
      }).from(spotsTable).where(eq(spotsTable.type, type));

      const total = row?.total ?? 0;
      const occupied = row?.occupied ?? 0;
      return {
        type,
        total,
        occupied,
        available: row?.available ?? 0,
        occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
      };
    })
  );

  res.json(result.filter((r) => r.total > 0));
});

router.get("/dashboard/revenue-trend", async (_req, res): Promise<void> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(gte(transactionsTable.date, thirtyDaysAgo))
    .orderBy(transactionsTable.date);

  // Group by date
  const byDate = new Map<string, { revenue: number; sessions: number; subscriptions: number }>();

  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    byDate.set(key, { revenue: 0, sessions: 0, subscriptions: 0 });
  }

  for (const t of transactions) {
    const key = new Date(t.date).toISOString().split("T")[0];
    const entry = byDate.get(key);
    if (entry) {
      const amount = parseFloat(t.amount);
      entry.revenue += amount;
      if (t.type === "session") entry.sessions += 1;
      if (t.type === "subscription") entry.subscriptions += amount;
    }
  }

  res.json(
    Array.from(byDate.entries()).map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue * 100) / 100,
      sessions: data.sessions,
      subscriptions: Math.round(data.subscriptions * 100) / 100,
    }))
  );
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const limit = parseInt(String(req.query.limit ?? "10"), 10);

  const sessions = await db
    .select()
    .from(sessionsTable)
    .orderBy(desc(sessionsTable.entryTime))
    .limit(limit * 2);

  const activities = [];

  for (const s of sessions) {
    if (activities.length >= limit) break;

    // Add exit event if completed
    if (s.status === "completed" && s.exitTime) {
      activities.push({
        id: s.id * 1000 + 1,
        type: "exit",
        plate: s.plate,
        vehicleType: s.vehicleType,
        driverName: s.driverName ?? null,
        spotNumber: null,
        amount: s.amount !== null ? parseFloat(s.amount) : null,
        time: s.exitTime,
        isSubscriber: s.isSubscriber,
      });
    }

    activities.push({
      id: s.id * 1000,
      type: "entry",
      plate: s.plate,
      vehicleType: s.vehicleType,
      driverName: s.driverName ?? null,
      spotNumber: null,
      amount: null,
      time: s.entryTime,
      isSubscriber: s.isSubscriber,
    });
  }

  activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  res.json(activities.slice(0, limit));
});

export default router;
