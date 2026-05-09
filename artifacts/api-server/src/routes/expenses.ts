import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, expensesTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const VALID_CATEGORIES = ["personnel", "maintenance", "taxes", "rent", "utilities", "marketing", "other"] as const;
const VALID_RECURRENCES = ["once", "monthly", "weekly"] as const;

const ExpenseBody = z.object({
  category: z.enum(VALID_CATEGORIES),
  description: z.string().min(1, "Descrição obrigatória"),
  amount: z.number().positive("Valor deve ser positivo"),
  date: z.string(),
  recurrence: z.enum(VALID_RECURRENCES).default("once"),
  costCenter: z.string().optional(),
  notes: z.string().optional(),
});

function parseExpense(e: typeof expensesTable.$inferSelect) {
  return { ...e, amount: parseFloat(e.amount) };
}

// GET /expenses
router.get("/expenses", async (req, res): Promise<void> => {
  const Params = z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    category: z.string().optional(),
    limit: z.coerce.number().default(200),
  });
  const query = Params.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: "Parâmetros inválidos" }); return; }

  const conditions = [];
  if (query.data.dateFrom) conditions.push(gte(expensesTable.date, new Date(query.data.dateFrom)));
  if (query.data.dateTo) {
    const dt = new Date(query.data.dateTo);
    dt.setHours(23, 59, 59, 999);
    conditions.push(lte(expensesTable.date, dt));
  }
  if (query.data.category) conditions.push(eq(expensesTable.category, query.data.category));

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(expensesTable.date))
    .limit(query.data.limit);

  res.json(expenses.map(parseExpense));
});

// POST /expenses
router.post("/expenses", async (req, res): Promise<void> => {
  const parsed = ExpenseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [expense] = await db
    .insert(expensesTable)
    .values({
      ...parsed.data,
      amount: String(parsed.data.amount),
      date: new Date(parsed.data.date),
    })
    .returning();

  res.status(201).json(parseExpense(expense));
});

// PUT /expenses/:id
router.put("/expenses/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const parsed = ExpenseBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.amount !== undefined) updateData.amount = String(parsed.data.amount);
  if (parsed.data.date !== undefined) updateData.date = new Date(parsed.data.date);

  const [expense] = await db
    .update(expensesTable)
    .set(updateData)
    .where(eq(expensesTable.id, id))
    .returning();

  if (!expense) { res.status(404).json({ error: "Despesa não encontrada" }); return; }
  res.json(parseExpense(expense));
});

// DELETE /expenses/:id
router.delete("/expenses/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

  const [expense] = await db
    .delete(expensesTable)
    .where(eq(expensesTable.id, id))
    .returning();

  if (!expense) { res.status(404).json({ error: "Despesa não encontrada" }); return; }
  res.json({ ok: true });
});

export default router;
