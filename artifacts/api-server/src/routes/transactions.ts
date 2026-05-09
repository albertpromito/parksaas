import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, transactionsTable } from "@workspace/db";
import { ListTransactionsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/transactions", async (req, res): Promise<void> => {
  const query = ListTransactionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let conditions = [];
  if (query.data.type) conditions.push(eq(transactionsTable.type, query.data.type));
  if (query.data.paymentMethod) conditions.push(eq(transactionsTable.paymentMethod, query.data.paymentMethod));
  if (query.data.dateFrom) {
    conditions.push(gte(transactionsTable.date, new Date(query.data.dateFrom as string)));
  }
  if (query.data.dateTo) {
    const dateTo = new Date(query.data.dateTo as string);
    dateTo.setHours(23, 59, 59, 999);
    conditions.push(lte(transactionsTable.date, dateTo));
  }

  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transactionsTable.date))
    .limit(query.data.limit ?? 50)
    .offset(query.data.offset ?? 0);

  res.json(transactions.map((t) => ({
    ...t,
    amount: parseFloat(t.amount),
    paymentMethod: t.paymentMethod ?? null,
    plate: t.plate ?? null,
    customerName: t.customerName ?? null,
  })));
});

export default router;
