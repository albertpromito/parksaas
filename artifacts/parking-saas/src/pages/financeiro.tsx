import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListTransactions, useGetRevenueReport, useGetOccupancyReport } from "@workspace/api-client-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, Target,
  ParkingSquare, Zap, BarChart3, ArrowUpRight, ArrowDownRight,
  CalendarDays, RefreshCw, Car, Users, AlertCircle,
  Plus, Pencil, Trash2, Loader2, Receipt,
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Helpers ───────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n ?? 0);

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `R$${(n / 1_000).toFixed(1)}k`;
  return fmt(n);
};

const fmtDate = (s: string) => {
  try { return format(parseISO(s), "dd/MM", { locale: ptBR }); } catch { return s; }
};

const METHOD_LABEL: Record<string, string> = {
  pix: "PIX", cash: "Dinheiro", credit_card: "Cartão Créd.",
  debit_card: "Cartão Déb.", transfer: "Transferência", other: "Outros",
};

const METHOD_COLOR: Record<string, string> = {
  pix: "#10B981", cash: "#3B82F6", credit_card: "#8B5CF6",
  debit_card: "#6366F1", transfer: "#F59E0B", other: "#6B7280",
};

const TYPE_COLOR: Record<string, string> = {
  session: "#3B82F6", subscription: "#10B981", fine: "#EF4444",
};

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ─── API hooks ──────────────────────────────────────────────────────────────

const apiFetch = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

const useExecutive = () =>
  useQuery({ queryKey: ["finance", "executive"], queryFn: () => apiFetch("/api/finance/executive"), staleTime: 60_000 });

const useCashflow = (dateFrom: string, dateTo: string) =>
  useQuery({ queryKey: ["finance", "cashflow", dateFrom, dateTo], queryFn: () => apiFetch(`/api/finance/cashflow?dateFrom=${dateFrom}&dateTo=${dateTo}`), staleTime: 60_000 });

const useHeatmap = (weeks: number) =>
  useQuery({ queryKey: ["finance", "heatmap", weeks], queryFn: () => apiFetch(`/api/finance/heatmap?weeks=${weeks}`), staleTime: 60_000 });

const useDre = (dateFrom: string, dateTo: string) =>
  useQuery({ queryKey: ["finance", "dre", dateFrom, dateTo], queryFn: () => apiFetch(`/api/finance/dre?dateFrom=${dateFrom}&dateTo=${dateTo}`), staleTime: 30_000 });

// ─── Expenses ────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES: Record<string, { label: string; color: string }> = {
  personnel:   { label: "Pessoal e encargos",       color: "#8B5CF6" },
  maintenance: { label: "Manutenção e reparos",      color: "#F59E0B" },
  taxes:       { label: "Impostos e taxas",          color: "#EF4444" },
  rent:        { label: "Aluguel e locação",         color: "#3B82F6" },
  utilities:   { label: "Água, luz e comunicação",   color: "#10B981" },
  marketing:   { label: "Marketing e publicidade",   color: "#EC4899" },
  other:       { label: "Outros",                    color: "#6B7280" },
};

const RECURRENCE_LABELS: Record<string, string> = {
  once: "Único", monthly: "Mensal", weekly: "Semanal",
};

type ExpenseItem = {
  id: number; category: string; description: string; amount: number;
  date: string; recurrence: string; costCenter: string | null; notes: string | null;
};

const apiMutate = (url: string, method: string, body?: object) =>
  fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });

const useExpenses = (dateFrom: string, dateTo: string) =>
  useQuery<ExpenseItem[]>({ queryKey: ["expenses", dateFrom, dateTo], queryFn: () => apiFetch(`/api/expenses?dateFrom=${dateFrom}&dateTo=${dateTo}&limit=500`), staleTime: 30_000 });

const useCreateExpense = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (body: object) => apiMutate("/api/expenses", "POST", body), onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["finance", "dre"] }); } });
};

const useUpdateExpense = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, body }: { id: number; body: object }) => apiMutate(`/api/expenses/${id}`, "PUT", body), onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["finance", "dre"] }); } });
};

const useDeleteExpense = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: number) => apiMutate(`/api/expenses/${id}`, "DELETE"), onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["finance", "dre"] }); } });
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({ title, value, sub, trend, trendLabel, icon: Icon, accent = false }: {
  title: string; value: string; sub?: string; trend?: number; trendLabel?: string;
  icon: React.ElementType; accent?: boolean;
}) {
  const up = (trend ?? 0) >= 0;
  return (
    <Card className={`relative overflow-hidden ${accent ? "border-primary/40 bg-primary/5" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</p>
            <p className={`text-2xl font-bold mt-1 tracking-tight ${accent ? "text-primary" : ""}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${accent ? "bg-primary/20" : "bg-muted"}`}>
            <Icon className={`w-4.5 h-4.5 ${accent ? "text-primary" : "text-muted-foreground"}`} style={{ width: 18, height: 18 }} />
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${up ? "text-emerald-600" : "text-red-500"}`}>
            {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>{Math.abs(trend)}% {trendLabel ?? "vs mês anterior"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold tracking-tight">{children}</h3>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold mb-2 text-muted-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Heatmap ────────────────────────────────────────────────────────────────

function RevenueHeatmap({ data }: { data: { dayOfWeek: number; hour: number; value: number; count: number }[] }) {
  const matrix: (typeof data[0])[][] = Array.from({ length: 7 }, (_, dow) =>
    Array.from({ length: 24 }, (_, h) => data.find((d) => d.dayOfWeek === dow && d.hour === h) ?? { dayOfWeek: dow, hour: h, value: 0, count: 0 })
  );
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  const cellColor = (v: number) => {
    if (v === 0) return "bg-muted/40";
    const intensity = Math.pow(v / maxVal, 0.5);
    if (intensity < 0.25) return "bg-yellow-100 dark:bg-yellow-950";
    if (intensity < 0.5) return "bg-yellow-300 dark:bg-yellow-700";
    if (intensity < 0.75) return "bg-yellow-400 dark:bg-yellow-500";
    return "bg-yellow-500 dark:bg-yellow-400";
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="grid gap-0.5" style={{ gridTemplateColumns: "40px repeat(24, 1fr)" }}>
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="text-center text-[9px] text-muted-foreground pb-1 font-mono">
              {h % 3 === 0 ? `${h}h` : ""}
            </div>
          ))}
          {matrix.map((row, dow) => (
            <>
              <div key={`label-${dow}`} className="flex items-center text-xs text-muted-foreground font-medium pr-2 justify-end" style={{ fontSize: 11 }}>
                {DAY_LABELS[dow]}
              </div>
              {row.map((cell) => (
                <div
                  key={`${cell.dayOfWeek}-${cell.hour}`}
                  title={cell.value > 0 ? `${DAY_LABELS[cell.dayOfWeek]} ${cell.hour}h — ${fmt(cell.value)} (${cell.count} tx)` : undefined}
                  className={`h-5 rounded-sm cursor-default transition-opacity hover:opacity-80 ${cellColor(cell.value)}`}
                />
              ))}
            </>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-[10px] text-muted-foreground">Menor receita</span>
          {["bg-muted/40", "bg-yellow-100", "bg-yellow-300", "bg-yellow-400", "bg-yellow-500"].map((c) => (
            <div key={c} className={`w-4 h-3 rounded-sm ${c}`} />
          ))}
          <span className="text-[10px] text-muted-foreground">Maior receita</span>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 1: Dashboard Executivo ──────────────────────────────────────────────

function ExecutiveDashboard() {
  const { data, isLoading, refetch, isFetching } = useExecutive();

  const monthTrend = data
    ? data.prevMonth.revenue > 0
      ? Math.round(((data.month.revenue - data.prevMonth.revenue) / data.prevMonth.revenue) * 100)
      : null
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />) : (
          <>
            <KpiCard title="Faturamento Hoje" value={fmt(data?.today.revenue ?? 0)} sub={`${data?.today.transactions ?? 0} transações`} icon={DollarSign} accent />
            <KpiCard title="Faturamento Mensal" value={fmt(data?.month.revenue ?? 0)} sub={`${data?.month.transactions ?? 0} transações`} trend={monthTrend ?? undefined} icon={TrendingUp} />
            <KpiCard title="Ticket Médio (mês)" value={fmt(data?.month.avgTicket ?? 0)} sub="Valor médio por transação" icon={Target} />
            <KpiCard title="Ocupação Atual" value={`${data?.occupancyRate ?? 0}%`} sub={`${data?.occupiedSpots ?? 0} / ${data?.totalSpots ?? 0} vagas`} icon={ParkingSquare} />
          </>
        )}
      </div>

      {/* Revenue trend chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Evolução da Receita — Últimos 30 dias</CardTitle>
            <p className="text-xs text-muted-foreground">Período atual vs período anterior</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data?.trend ?? []} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EAB308" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPrev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tickFormatter={(v) => fmtShort(v)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} formatter={(v: any) => fmt(v)} labelFormatter={fmtDate} />
                  <Area type="monotone" dataKey="revenue" name="Atual" stroke="#EAB308" strokeWidth={2} fill="url(#gradRevenue)" dot={false} />
                  <Area type="monotone" dataKey="prevRevenue" name="Anterior" stroke="#94A3B8" strokeWidth={1.5} fill="url(#gradPrev)" dot={false} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment method pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Receita por Pagamento</CardTitle>
            <p className="text-xs text-muted-foreground">Mês atual</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <div>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={data?.byPaymentMethod ?? []} dataKey="amount" nameKey="method" cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2}>
                      {(data?.byPaymentMethod ?? []).map((entry: any) => (
                        <Cell key={entry.method} fill={METHOD_COLOR[entry.method] ?? "#6B7280"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-1">
                  {(data?.byPaymentMethod ?? []).map((m: any) => (
                    <div key={m.method} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: METHOD_COLOR[m.method] ?? "#6B7280" }} />
                      <span className="flex-1 text-muted-foreground">{METHOD_LABEL[m.method] ?? m.method}</span>
                      <span className="font-semibold">{m.pct}%</span>
                    </div>
                  ))}
                  {(data?.byPaymentMethod ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Sem dados</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue by type + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Receita por Categoria</CardTitle>
            <p className="text-xs text-muted-foreground">Distribuição mensal</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-40 w-full" /> : (
              <div className="space-y-3 pt-1">
                {(data?.revenueByType ?? []).map((item: any) => {
                  const total = (data?.month.revenue ?? 0);
                  const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0;
                  return (
                    <div key={item.type}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-semibold">{fmt(item.amount)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: TYPE_COLOR[item.type] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Mapa de Calor Financeiro</CardTitle>
            <p className="text-xs text-muted-foreground">Receita por dia da semana × hora — últimas 8 semanas</p>
          </CardHeader>
          <CardContent>
            <HeatmapSection />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HeatmapSection() {
  const { data, isLoading } = useHeatmap(8);
  if (isLoading) return <Skeleton className="h-36 w-full" />;
  return <RevenueHeatmap data={data?.data ?? []} />;
}

// ─── Tab 2: Fluxo de Caixa ───────────────────────────────────────────────────

function FluxoDeCaixa() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(() => format(startOfMonth(now), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(() => format(now, "yyyy-MM-dd"));

  const { data, isLoading, refetch } = useCashflow(dateFrom, dateTo);

  const hasData = (data?.period ?? []).some((d: any) => d.total > 0);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 h-8 text-sm" />
        </div>
        <div className="flex gap-2">
          {[
            { label: "Mês atual", from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") },
            { label: "Mês anterior", from: format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd"), to: format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd") },
            { label: "Últimos 90d", from: format(new Date(now.getTime() - 90 * 86400000), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") },
          ].map((p) => (
            <Button key={p.label} variant="outline" size="sm" className="text-xs h-8" onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}>
              {p.label}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {isLoading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : (
          <>
            <KpiCard title="Entradas Totais" value={fmt(data?.totalInflow ?? 0)} sub={`${data?.totalTransactions ?? 0} transações`} icon={TrendingUp} accent />
            <KpiCard title="Transações" value={String(data?.totalTransactions ?? 0)} sub="No período" icon={CreditCard} />
            <KpiCard title="Média Diária" value={fmt(data?.avgDaily ?? 0)} sub="Nos dias com movimento" icon={CalendarDays} />
          </>
        )}
      </div>

      {/* Stacked bar: entries by type */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Entradas por Dia e Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-56 w-full" /> : !hasData ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">Sem movimentação no período</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.period ?? []} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor((data?.period?.length ?? 1) / 8)} />
                <YAxis tickFormatter={(v) => fmtShort(v)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="sessions" name="Sessões" stackId="a" fill={TYPE_COLOR.session} radius={[0, 0, 0, 0]} />
                <Bar dataKey="subscriptions" name="Mensalidades" stackId="a" fill={TYPE_COLOR.subscription} />
                <Bar dataKey="fines" name="Multas" stackId="a" fill={TYPE_COLOR.fine} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Running balance + Method breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Saldo Acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : !hasData ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={data?.period ?? []} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor((data?.period?.length ?? 1) / 8)} />
                  <YAxis tickFormatter={(v) => fmtShort(v)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: any) => fmt(v)} labelFormatter={fmtDate} />
                  <Line type="monotone" dataKey="running" name="Saldo acumulado" stroke="#EAB308" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Por Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <div className="space-y-3">
                {(data?.byMethod ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground py-8 text-center">Sem dados no período</p>
                )}
                {(data?.byMethod ?? []).sort((a: any, b: any) => b.amount - a.amount).map((m: any) => (
                  <div key={m.method}>
                    <div className="flex justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: METHOD_COLOR[m.method] ?? "#6B7280" }} />
                        <span className="font-medium">{METHOD_LABEL[m.method] ?? m.method}</span>
                      </div>
                      <span className="text-muted-foreground">{m.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-0.5">
                      <div className="h-full rounded-full" style={{ width: `${m.pct}%`, backgroundColor: METHOD_COLOR[m.method] ?? "#6B7280" }} />
                    </div>
                    <p className="text-right text-xs font-semibold">{fmt(m.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab 3: DRE / Relatórios ─────────────────────────────────────────────────

function DreRow({ label, value, level = 0, bold = false, separator = false, positive = true }: {
  label: string; value: number | string; level?: number; bold?: boolean; separator?: boolean; positive?: boolean;
}) {
  if (separator) return <tr><td colSpan={2} className="py-0"><div className="border-t border-border my-1" /></td></tr>;
  const numVal = typeof value === "number" ? value : null;
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className={`py-2 text-sm text-left ${bold ? "font-semibold" : "text-muted-foreground"}`} style={{ paddingLeft: `${12 + level * 16}px` }}>
        {level > 0 && <span className="text-muted-foreground/40 mr-2">└</span>}
        {label}
      </td>
      <td className={`py-2 text-sm text-right pr-4 font-mono ${bold ? "font-bold" : ""} ${numVal !== null && numVal >= 0 && positive ? "text-emerald-600" : numVal !== null && numVal < 0 ? "text-red-500" : ""}`}>
        {typeof value === "number" ? fmt(value) : value}
      </td>
    </tr>
  );
}

function Relatorios() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(() => format(startOfMonth(now), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(() => format(now, "yyyy-MM-dd"));
  const { data, isLoading } = useDre(dateFrom, dateTo);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 h-8 text-sm" />
        </div>
        {[
          { label: "Mês atual", from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") },
          { label: "Mês anterior", from: format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd"), to: format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd") },
        ].map((p) => (
          <Button key={p.label} variant="outline" size="sm" className="text-xs h-8" onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}>
            {p.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DRE Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">DRE — Demonstrativo de Resultado</CardTitle>
            {data && <p className="text-xs text-muted-foreground">{fmtDate(data.period.from)} a {fmtDate(data.period.to)}</p>}
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-72 w-full" /> : (
              <table className="w-full">
                <tbody>
                  <DreRow label="(+) Receita Bruta Operacional" value={data?.grossRevenue ?? 0} bold />
                  <DreRow label="Sessões avulsas" value={data?.sessionRevenue ?? 0} level={1} />
                  <DreRow label="Mensalidades" value={data?.subscriptionRevenue ?? 0} level={1} />
                  <DreRow label="Multas e outras" value={data?.fineRevenue ?? 0} level={1} />
                  <DreRow label="" value="" separator />
                  <DreRow label="(=) Receita Operacional Líquida" value={data?.grossRevenue ?? 0} bold />
                  <DreRow label="" value="" separator />
                  <DreRow label="(–) Custos Operacionais" value={-(data?.operationalCosts ?? 0)} bold positive={false} />
                  <DreRow label="Manutenção e reparos" value={-(data?.expensesByCategory?.maintenance ?? 0)} level={1} positive={false} />
                  <DreRow label="Água, luz e comunicação" value={-(data?.expensesByCategory?.utilities ?? 0)} level={1} positive={false} />
                  <DreRow label="" value="" separator />
                  <DreRow label="(–) Despesas Administrativas" value={-(data?.adminExpenses ?? 0)} bold positive={false} />
                  <DreRow label="Pessoal e encargos" value={-(data?.expensesByCategory?.personnel ?? 0)} level={1} positive={false} />
                  <DreRow label="Aluguel e locação" value={-(data?.expensesByCategory?.rent ?? 0)} level={1} positive={false} />
                  <DreRow label="Impostos e taxas" value={-(data?.expensesByCategory?.taxes ?? 0)} level={1} positive={false} />
                  <DreRow label="Marketing" value={-(data?.expensesByCategory?.marketing ?? 0)} level={1} positive={false} />
                  <DreRow label="Outros" value={-(data?.expensesByCategory?.other ?? 0)} level={1} positive={false} />
                  <DreRow label="" value="" separator />
                  <DreRow label="(=) Resultado / EBITDA" value={data?.netResult ?? data?.grossRevenue ?? 0} bold />
                </tbody>
              </table>
            )}
            {(data?.totalExpenses ?? 0) === 0 && (
              <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Lance despesas na aba "Despesas" para completar o DRE
              </p>
            )}
          </CardContent>
        </Card>

        {/* Key metrics + payment breakdown */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {isLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />) : (
              <>
                <KpiCard title="Receita Bruta" value={fmt(data?.grossRevenue ?? 0)} icon={DollarSign} accent />
                <KpiCard title="Ticket Médio" value={fmt(data?.avgTicket ?? 0)} sub="Por transação" icon={Target} />
                <KpiCard title="Sessões" value={String(data?.sessionCount ?? 0)} sub={fmt(data?.sessionRevenue ?? 0)} icon={Car} />
                <KpiCard title="Mensalidades" value={String(data?.subscriptionCount ?? 0)} sub={fmt(data?.subscriptionRevenue ?? 0)} icon={Users} />
              </>
            )}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Mix de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-36 w-full" /> : (
                <div className="flex gap-4 items-center">
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart>
                      <Pie data={data?.byPaymentMethod ?? [{ method: "other", amount: 1 }]} dataKey="amount" nameKey="method" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2}>
                        {(data?.byPaymentMethod ?? []).map((entry: any) => (
                          <Cell key={entry.method} fill={METHOD_COLOR[entry.method] ?? "#6B7280"} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {(data?.byPaymentMethod ?? []).map((m: any) => (
                      <div key={m.method} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: METHOD_COLOR[m.method] ?? "#6B7280" }} />
                          <span className="text-muted-foreground">{METHOD_LABEL[m.method] ?? m.method}</span>
                        </div>
                        <span className="font-semibold">{fmt(m.amount)}</span>
                      </div>
                    ))}
                    {(data?.byPaymentMethod ?? []).length === 0 && (
                      <p className="text-xs text-muted-foreground">Sem dados</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Expense Form Dialog ──────────────────────────────────────────────────────

function ExpenseFormDialog({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: ExpenseItem | null }) {
  const [cat, setCat] = useState("other");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [recurrence, setRecurrence] = useState("once");
  const [costCenter, setCostCenter] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setCat(editing?.category ?? "other");
      setDesc(editing?.description ?? "");
      setAmount(editing?.amount?.toString() ?? "");
      setDate(editing?.date ? editing.date.split("T")[0] : format(new Date(), "yyyy-MM-dd"));
      setRecurrence(editing?.recurrence ?? "once");
      setCostCenter(editing?.costCenter ?? "");
      setNotes(editing?.notes ?? "");
    }
  }, [open, editing]);

  const create = useCreateExpense();
  const update = useUpdateExpense();
  const loading = create.isPending || update.isPending;
  const valid = desc.trim().length > 0 && parseFloat(amount) > 0 && date.length > 0;

  const handleSubmit = async () => {
    if (!valid) return;
    const body = { category: cat, description: desc.trim(), amount: parseFloat(amount), date, recurrence, costCenter: costCenter.trim() || undefined, notes: notes.trim() || undefined };
    if (editing) { await update.mutateAsync({ id: editing.id, body }); }
    else { await create.mutateAsync(body); }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Categoria *</Label>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Descrição *</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: Salário do segurança" className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Valor (R$) *</Label>
              <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Recorrência</Label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Único</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Centro de Custo</Label>
              <Input value={costCenter} onChange={(e) => setCostCenter(e.target.value)} placeholder="Ex: Operações" className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes opcionais..." className="text-sm resize-none" rows={2} />
          </div>
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading || !valid}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab 5: Despesas ─────────────────────────────────────────────────────────

function DespesasTab() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(() => format(startOfMonth(now), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(() => format(now, "yyyy-MM-dd"));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseItem | null>(null);

  const { data: expenses, isLoading } = useExpenses(dateFrom, dateTo);
  const deleteExp = useDeleteExpense();

  const total = useMemo(() => (expenses ?? []).reduce((s, e) => s + e.amount, 0), [expenses]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses ?? []) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return Array.from(map.entries()).map(([k, v]) => ({ category: k, amount: v, label: EXPENSE_CATEGORIES[k]?.label ?? k, color: EXPENSE_CATEGORIES[k]?.color ?? "#6B7280" })).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (e: ExpenseItem) => { setEditing(e); setDialogOpen(true); };
  const handleDelete = (id: number) => { if (confirm("Excluir esta despesa?")) deleteExp.mutate(id); };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-8 text-sm" />
          </div>
          {[
            { label: "Mês atual", from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") },
            { label: "Mês anterior", from: format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd"), to: format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd") },
          ].map((p) => (
            <Button key={p.label} variant="outline" size="sm" className="text-xs h-8" onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}>
              {p.label}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Despesa
        </Button>
      </div>

      {/* Summary + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total de Despesas</p>
              <p className="text-2xl font-bold mt-1 text-red-500">{fmt(total)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{expenses?.length ?? 0} lançamentos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Por Categoria</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {byCategory.map((c) => (
                  <div key={c.category}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="text-muted-foreground truncate max-w-[130px]">{c.label}</span>
                      </div>
                      <span className="font-semibold text-red-500">{fmt(c.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${total > 0 ? Math.round((c.amount / total) * 100) : 0}%`, backgroundColor: c.color }} />
                    </div>
                  </div>
                ))}
                {byCategory.length === 0 && !isLoading && (
                  <p className="text-xs text-muted-foreground py-4 text-center">Sem despesas no período</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : !expenses?.length ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Receipt className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm font-medium">Nenhuma despesa lançada</p>
                <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Despesa" para adicionar custos operacionais</p>
                <Button size="sm" onClick={openAdd} className="mt-4 gap-2">
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar primeira despesa
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="divide-y divide-border">
                {expenses.map((e) => {
                  const cfg = EXPENSE_CATEGORIES[e.category];
                  return (
                    <div key={e.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                      <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: cfg?.color ?? "#6B7280" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{e.description}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{cfg?.label ?? e.category}</Badge>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">{RECURRENCE_LABELS[e.recurrence] ?? e.recurrence}</Badge>
                          {e.costCenter && <span className="text-[10px] text-muted-foreground">{e.costCenter}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-red-500">-{fmt(e.amount)}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(e.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(e)}>
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => handleDelete(e.id)} disabled={deleteExp.isPending}>
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>

      <ExpenseFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} editing={editing} />
    </div>
  );
}

// ─── Tab 5: Relatórios Analytics ─────────────────────────────────────────────

const REPORT_COLORS = ["#EAB308", "#3B82F6", "#10B981", "#F97316", "#8B5CF6"];

const PAYMENT_LABELS_REPORT: Record<string, string> = {
  cash: "Dinheiro", credit_card: "Cartão Crédito", debit_card: "Cartão Débito",
  pix: "PIX", transfer: "Transferência", unknown: "Outros",
};

const SPOT_TYPE_LABELS: Record<string, string> = {
  standard: "Padrão", handicapped: "PCD", vip: "VIP", motorcycle: "Moto", large: "Grande",
};

function RelatoriosAnalytics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(now.toISOString().split("T")[0]);
  const [subTab, setSubTab] = useState("revenue");

  const revenueReport = useGetRevenueReport({ period, dateFrom: dateFrom as any, dateTo: dateTo as any });
  const occupancyReport = useGetOccupancyReport({ dateFrom: dateFrom as any, dateTo: dateTo as any });

  const r = revenueReport.data;
  const o = occupancyReport.data;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex gap-3 flex-wrap items-end">
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Agrupamento</Label>
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {[
          { label: "30 dias", from: thirtyDaysAgo.toISOString().split("T")[0], to: now.toISOString().split("T")[0] },
          { label: "Mês atual", from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd") },
          { label: "Mês anterior", from: format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd"), to: format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd") },
        ].map((p) => (
          <Button key={p.label} variant="outline" size="sm" className="text-xs h-8" onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}>
            {p.label}
          </Button>
        ))}
      </div>

      {/* Sub-tabs: Receita / Ocupação */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="h-8">
          <TabsTrigger value="revenue" className="text-xs px-4">Receita</TabsTrigger>
          <TabsTrigger value="occupancy" className="text-xs px-4">Ocupação</TabsTrigger>
        </TabsList>

        {/* Revenue */}
        <TabsContent value="revenue" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {revenueReport.isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
            ) : [
              { label: "Receita Total", value: fmt(r?.totalRevenue ?? 0) },
              { label: "Sessões", value: fmt(r?.sessionRevenue ?? 0) },
              { label: "Mensalidades", value: fmt(r?.subscriptionRevenue ?? 0) },
              { label: "Ticket Médio", value: fmt(r?.averageTicket ?? 0) },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-bold mt-1">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Receita por Período</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueReport.isLoading ? <Skeleton className="h-64 w-full" /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={r?.points ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => format(new Date(v + "T00:00:00"), period === "monthly" ? "MMM/yy" : "dd/MM", { locale: ptBR })}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${v}`} width={60} />
                    <Tooltip
                      formatter={(value: number, name: string) => [fmt(value), name === "revenue" ? "Total" : name === "subscriptions" ? "Mensalidades" : "Sessões"]}
                      labelFormatter={(l) => format(new Date(l + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                    />
                    <Bar dataKey="subscriptions" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="revenue" stackId="b" fill="#EAB308" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Por Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueReport.isLoading ? <Skeleton className="h-52 w-full" /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={(r?.byPaymentMethod ?? []).map((m) => ({ name: PAYMENT_LABELS_REPORT[m.method] ?? m.method, value: m.amount }))}
                        cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value"
                      >
                        {(r?.byPaymentMethod ?? []).map((_, i) => <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }} />
                      <Legend formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Detalhamento por Método</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueReport.isLoading ? (
                  <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                ) : (
                  <div className="space-y-3">
                    {(r?.byPaymentMethod ?? []).sort((a, b) => b.amount - a.amount).map((m, i) => {
                      const pct = r && r.totalRevenue > 0 ? (m.amount / r.totalRevenue * 100) : 0;
                      return (
                        <div key={m.method}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium">{PAYMENT_LABELS_REPORT[m.method] ?? m.method}</span>
                            <span className="text-muted-foreground">{fmt(m.amount)} · {m.count} transações</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: REPORT_COLORS[i % REPORT_COLORS.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Occupancy */}
        <TabsContent value="occupancy" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {occupancyReport.isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
            ) : [
              { label: "Ocupação Média", value: `${o?.averageOccupancyRate ?? 0}%` },
              { label: "Pico de Ocupação", value: `${o?.peakOccupancyRate ?? 0}%` },
              { label: "Total de Sessões", value: String(o?.totalSessions ?? 0) },
              { label: "Duração Média", value: `${o?.averageDurationMinutes ?? 0} min` },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-bold mt-1">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Fluxo por Hora do Dia</CardTitle>
            </CardHeader>
            <CardContent>
              {occupancyReport.isLoading ? <Skeleton className="h-64 w-full" /> : (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={o?.byHour ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="colorHourRep" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" tickFormatter={(v) => `${String(v).padStart(2, "0")}h`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                    <Tooltip formatter={(v: number) => [`${v}%`, "Ocupação"]} labelFormatter={(l) => `${String(l).padStart(2, "0")}:00`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }} />
                    <Area type="monotone" dataKey="avgOccupancy" stroke="#EAB308" strokeWidth={2} fill="url(#colorHourRep)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Ocupação por Tipo de Vaga</CardTitle>
            </CardHeader>
            <CardContent>
              {occupancyReport.isLoading ? (
                <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <div className="space-y-4">
                  {(o?.bySpotType ?? []).map((item, i) => (
                    <div key={item.type}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium">{SPOT_TYPE_LABELS[item.type] ?? item.type}</span>
                        <span className="text-muted-foreground">{item.occupied}/{item.total} vagas · <strong>{item.occupancyRate}%</strong></span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${item.occupancyRate}%`, backgroundColor: REPORT_COLORS[i % REPORT_COLORS.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Tab 6: Transações ────────────────────────────────────────────────────────

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Dinheiro", credit_card: "Cartão Créd.", debit_card: "Cartão Déb.", pix: "PIX", transfer: "Transferência",
};

function TransacoesList() {
  const [filterType, setFilterType] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const params: any = { limit: 200 };
  if (filterType) params.type = filterType;
  if (filterPayment) params.paymentMethod = filterPayment;
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  const { data: txns, isLoading } = useListTransactions(params);

  const total = useMemo(() => (txns ?? []).reduce((s, t) => s + t.amount, 0), [txns]);

  const TypeIcon = ({ type }: { type: string }) => {
    if (type === "session") return <Car className="w-4 h-4 text-blue-500" />;
    if (type === "subscription") return <Users className="w-4 h-4 text-emerald-500" />;
    return <DollarSign className="w-4 h-4 text-red-500" />;
  };

  const typeLabel = (t: string) => t === "session" ? "Sessão" : t === "subscription" ? "Mensalidade" : "Multa";

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-end">
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select value={filterType || "all"} onValueChange={(v) => setFilterType(v === "all" ? "" : v)}>
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="session">Sessão</SelectItem>
              <SelectItem value="subscription">Mensalidade</SelectItem>
              <SelectItem value="fine">Multa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Pagamento</Label>
          <Select value={filterPayment || "all"} onValueChange={(v) => setFilterPayment(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="cash">Dinheiro</SelectItem>
              <SelectItem value="credit_card">Cartão Créd.</SelectItem>
              <SelectItem value="debit_card">Cartão Déb.</SelectItem>
              <SelectItem value="transfer">Transferência</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-8 text-sm" />
        </div>
        {(filterType || filterPayment || dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterType(""); setFilterPayment(""); setDateFrom(""); setDateTo(""); }}>
            Limpar
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{txns?.length ?? 0} itens</span>
          <span className="text-xs font-bold text-emerald-600">{fmt(total)}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : !txns?.length ? (
        <Card><CardContent className="py-16 text-center"><CreditCard className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" /><p className="text-sm text-muted-foreground">Nenhuma transação encontrada</p></CardContent></Card>
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {txns.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <TypeIcon type={t.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 mr-1">{typeLabel(t.type)}</Badge>
                    {t.plate && <span>{t.plate} · </span>}
                    {t.customerName && <span>{t.customerName} · </span>}
                    {t.paymentMethod && (PAYMENT_LABELS[t.paymentMethod] ?? t.paymentMethod)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-emerald-600">+{fmt(t.amount)}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(t.date), "dd/MM HH:mm", { locale: ptBR })}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function FinanceiroPremium() {
  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight">Financeiro</h1>
                  <Badge className="text-[10px] px-2 py-0 bg-primary text-primary-foreground flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" />
                    Premium
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Controle financeiro completo da operação</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        <Tabs defaultValue="painel">
          <TabsList className="mb-6 h-9 flex-wrap">
            <TabsTrigger value="painel" className="text-xs px-3">Painel Executivo</TabsTrigger>
            <TabsTrigger value="fluxo" className="text-xs px-3">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="despesas" className="text-xs px-3">Despesas</TabsTrigger>
            <TabsTrigger value="dre" className="text-xs px-3">DRE</TabsTrigger>
            <TabsTrigger value="relatorios" className="text-xs px-3">Relatórios</TabsTrigger>
            <TabsTrigger value="transacoes" className="text-xs px-3">Transações</TabsTrigger>
          </TabsList>
          <TabsContent value="painel"><ExecutiveDashboard /></TabsContent>
          <TabsContent value="fluxo"><FluxoDeCaixa /></TabsContent>
          <TabsContent value="despesas"><DespesasTab /></TabsContent>
          <TabsContent value="dre"><Relatorios /></TabsContent>
          <TabsContent value="relatorios"><RelatoriosAnalytics /></TabsContent>
          <TabsContent value="transacoes"><TransacoesList /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
