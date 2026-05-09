import { useGetDashboardSummary, useGetDashboardOccupancy, useGetDashboardRevenueTrend, useGetDashboardRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Car, ParkingSquare, Users, TrendingUp, DollarSign, AlertTriangle, ArrowDownRight, ArrowUpRight, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function KpiCard({ title, value, sub, icon: Icon, trend, loading }: {
  title: string; value: string; sub?: string; icon: React.ElementType; trend?: "up" | "down" | "neutral"; loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-2" />
            ) : (
              <p className="text-2xl font-bold mt-1 tabular-nums" data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
            )}
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${trend === "up" ? "bg-green-100 dark:bg-green-900/30" : trend === "down" ? "bg-red-100 dark:bg-red-900/30" : "bg-primary/10"}`}>
            <Icon className={`w-5 h-5 ${trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-primary"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const SPOT_TYPE_COLORS = ["#EAB308", "#3B82F6", "#8B5CF6", "#10B981", "#F97316"];
const SPOT_TYPE_LABELS: Record<string, string> = {
  standard: "Padrão",
  handicapped: "PCD",
  vip: "VIP",
  motorcycle: "Moto",
  large: "Grande",
};

export default function Dashboard() {
  const summary = useGetDashboardSummary();
  const occupancy = useGetDashboardOccupancy();
  const trend = useGetDashboardRevenueTrend();
  const activity = useGetDashboardRecentActivity({ limit: 8 });

  const s = summary.data;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão geral do estacionamento em tempo real</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Vagas Ocupadas"
          value={s ? `${s.occupiedSpots}/${s.totalSpots}` : "—"}
          sub={s ? `${s.occupancyRate}% de ocupação` : undefined}
          icon={ParkingSquare}
          trend={s && s.occupancyRate > 70 ? "down" : "up"}
          loading={summary.isLoading}
        />
        <KpiCard
          title="Sessões Ativas"
          value={s ? String(s.activeSessionsCount) : "—"}
          sub="veículos no momento"
          icon={Car}
          loading={summary.isLoading}
        />
        <KpiCard
          title="Receita Hoje"
          value={s ? formatCurrency(s.todayRevenue) : "—"}
          sub={s ? `${s.todaySessions} movimentos` : undefined}
          icon={DollarSign}
          trend="up"
          loading={summary.isLoading}
        />
        <KpiCard
          title="Mensalistas Ativos"
          value={s ? String(s.activeSubscribersCount) : "—"}
          sub={s && s.expiringSubscribersCount > 0 ? `${s.expiringSubscribersCount} vencendo em breve` : "todos em dia"}
          icon={Users}
          trend={s && s.expiringSubscribersCount > 0 ? "down" : "up"}
          loading={summary.isLoading}
        />
      </div>

      {/* Second row KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Receita do Mês"
          value={s ? formatCurrency(s.monthRevenue) : "—"}
          sub={s ? `${s.monthSessions} sessões` : undefined}
          icon={TrendingUp}
          trend="up"
          loading={summary.isLoading}
        />
        <KpiCard
          title="Vagas Disponíveis"
          value={s ? String(s.availableSpots) : "—"}
          sub="prontas para uso"
          icon={ParkingSquare}
          loading={summary.isLoading}
        />
        {s && s.expiringSubscribersCount > 0 && (
          <KpiCard
            title="Mensalistas Vencendo"
            value={String(s.expiringSubscribersCount)}
            sub="nos próximos 7 dias"
            icon={AlertTriangle}
            trend="down"
            loading={summary.isLoading}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Receita — Últimos 30 dias</CardTitle>
          </CardHeader>
          <CardContent>
            {trend.isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={trend.data ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => format(new Date(v + "T00:00:00"), "dd/MM", { locale: ptBR })}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    interval={6}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${v}`} width={55} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Receita"]}
                    labelFormatter={(label) => format(new Date(label + "T00:00:00"), "dd 'de' MMMM", { locale: ptBR })}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#EAB308" strokeWidth={2} fill="url(#colorRevenue)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Occupancy by type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Ocupação por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {occupancy.isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <div className="space-y-3">
                {(occupancy.data ?? []).map((item, i) => (
                  <div key={item.type}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">{SPOT_TYPE_LABELS[item.type] ?? item.type}</span>
                      <span className="text-muted-foreground">{item.occupied}/{item.total}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${item.occupancyRate}%`, backgroundColor: SPOT_TYPE_COLORS[i % SPOT_TYPE_COLORS.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Atividade Recente</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {activity.isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !activity.data?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade recente</p>
          ) : (
            <div className="divide-y divide-border">
              {(activity.data ?? []).map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3" data-testid={`activity-item-${item.id}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.type === "entry" ? "bg-green-100 dark:bg-green-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
                    {item.type === "entry" ? (
                      <ArrowUpRight className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.plate} <span className="text-muted-foreground font-normal">— {item.driverName ?? "Não identificado"}</span></p>
                    <p className="text-xs text-muted-foreground">
                      {item.type === "entry" ? "Entrada" : "Saída"} · {item.vehicleType === "car" ? "Carro" : item.vehicleType === "motorcycle" ? "Moto" : item.vehicleType}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {item.amount != null && <p className="text-sm font-semibold">{formatCurrency(item.amount)}</p>}
                    {item.isSubscriber && <Badge variant="outline" className="text-xs">Mensalista</Badge>}
                    <p className="text-xs text-muted-foreground">{format(new Date(item.time), "HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
