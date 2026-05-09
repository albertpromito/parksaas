import { useState } from "react";
import { useGetRevenueReport, useGetOccupancyReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const COLORS = ["#EAB308", "#3B82F6", "#10B981", "#F97316", "#8B5CF6"];
const PAYMENT_LABELS: Record<string, string> = {
  cash: "Dinheiro", credit_card: "Cartão Crédito", debit_card: "Cartão Débito", pix: "PIX", transfer: "Transferência", unknown: "Outros",
};
const SPOT_TYPE_LABELS: Record<string, string> = {
  standard: "Padrão", handicapped: "PCD", vip: "VIP", motorcycle: "Moto", large: "Grande",
};

export default function Reports() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(now.toISOString().split("T")[0]);

  const revenueReport = useGetRevenueReport({ period, dateFrom: dateFrom as any, dateTo: dateTo as any });
  const occupancyReport = useGetOccupancyReport({ dateFrom: dateFrom as any, dateTo: dateTo as any });

  const r = revenueReport.data;
  const o = occupancyReport.data;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Análises e estatísticas de desempenho</p>
      </div>

      {/* Date range controls */}
      <div className="flex gap-3 flex-wrap items-end">
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" data-testid="input-report-from" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" data-testid="input-report-to" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Agrupamento</Label>
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-36" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="revenue">
        <TabsList data-testid="tabs-reports">
          <TabsTrigger value="revenue">Receita</TabsTrigger>
          <TabsTrigger value="occupancy">Ocupação</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6 mt-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {revenueReport.isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
            ) : [
              { label: "Receita Total", value: formatCurrency(r?.totalRevenue ?? 0) },
              { label: "Sessões", value: formatCurrency(r?.sessionRevenue ?? 0) },
              { label: "Mensalidades", value: formatCurrency(r?.subscriptionRevenue ?? 0) },
              { label: "Ticket Médio", value: formatCurrency(r?.averageTicket ?? 0) },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-bold mt-1" data-testid={`report-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Revenue chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Receita por Período</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueReport.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
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
                      formatter={(value: number, name: string) => [formatCurrency(value), name === "revenue" ? "Total" : name === "subscriptions" ? "Mensalidades" : "Sessões"]}
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

          {/* Payment method breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Por Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueReport.isLoading ? (
                  <Skeleton className="h-52 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={(r?.byPaymentMethod ?? []).map((m) => ({ name: PAYMENT_LABELS[m.method] ?? m.method, value: m.amount }))}
                        cx="50%" cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {(r?.byPaymentMethod ?? []).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }} />
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
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(r?.byPaymentMethod ?? []).sort((a, b) => b.amount - a.amount).map((m, i) => {
                      const pct = r && r.totalRevenue > 0 ? (m.amount / r.totalRevenue * 100) : 0;
                      return (
                        <div key={m.method}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium">{PAYMENT_LABELS[m.method] ?? m.method}</span>
                            <span className="text-muted-foreground">{formatCurrency(m.amount)} · {m.count} transações</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
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

        {/* Occupancy Tab */}
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
                  <p className="text-xl font-bold mt-1" data-testid={`occupancy-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Hourly chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Fluxo por Hora do Dia</CardTitle>
            </CardHeader>
            <CardContent>
              {occupancyReport.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={o?.byHour ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" tickFormatter={(v) => `${String(v).padStart(2, "0")}h`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                    <Tooltip formatter={(v: number) => [`${v}%`, "Ocupação"]} labelFormatter={(l) => `${String(l).padStart(2, "0")}:00`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }} />
                    <Area type="monotone" dataKey="avgOccupancy" stroke="#EAB308" strokeWidth={2} fill="url(#colorHour)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* By spot type */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Ocupação por Tipo de Vaga</CardTitle>
            </CardHeader>
            <CardContent>
              {occupancyReport.isLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {(o?.bySpotType ?? []).map((item, i) => (
                    <div key={item.type}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium">{SPOT_TYPE_LABELS[item.type] ?? item.type}</span>
                        <span className="text-muted-foreground">{item.occupied}/{item.total} vagas · <strong>{item.occupancyRate}%</strong></span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${item.occupancyRate}%`, backgroundColor: COLORS[i % COLORS.length] }} />
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
