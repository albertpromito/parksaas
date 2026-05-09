import { useState } from "react";
import { useListTransactions, getListTransactionsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, DollarSign, Car, Users, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  session: { label: "Sessão", icon: Car, color: "text-blue-500" },
  subscription: { label: "Mensalidade", icon: Users, color: "text-green-500" },
  fine: { label: "Multa", icon: DollarSign, color: "text-red-500" },
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Dinheiro", credit_card: "Cartão Crédito", debit_card: "Cartão Débito", pix: "PIX", transfer: "Transferência",
};

export default function Transactions() {
  const [filterType, setFilterType] = useState<string>("");
  const [filterPayment, setFilterPayment] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const params: any = { limit: 100 };
  if (filterType) params.type = filterType;
  if (filterPayment) params.paymentMethod = filterPayment;
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  const transactions = useListTransactions(params);

  const total = (transactions.data ?? []).reduce((s, t) => s + t.amount, 0);
  const bySession = (transactions.data ?? []).filter((t) => t.type === "session").reduce((s, t) => s + t.amount, 0);
  const bySubscription = (transactions.data ?? []).filter((t) => t.type === "subscription").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Histórico de transações e receitas</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold mt-1" data-testid="total-revenue">{formatCurrency(total)}</p>
            <p className="text-xs text-muted-foreground mt-1">{transactions.data?.length ?? 0} transações</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sessões</p>
            <p className="text-2xl font-bold mt-1 text-blue-600" data-testid="session-revenue">{formatCurrency(bySession)}</p>
            <p className="text-xs text-muted-foreground mt-1">{(transactions.data ?? []).filter((t) => t.type === "session").length} transações</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mensalidades</p>
            <p className="text-2xl font-bold mt-1 text-green-600" data-testid="subscription-revenue">{formatCurrency(bySubscription)}</p>
            <p className="text-xs text-muted-foreground mt-1">{(transactions.data ?? []).filter((t) => t.type === "subscription").length} transações</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select value={filterType || "all"} onValueChange={(v) => setFilterType(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40" data-testid="select-filter-type">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
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
            <SelectTrigger className="w-44" data-testid="select-filter-payment">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="cash">Dinheiro</SelectItem>
              <SelectItem value="credit_card">Cartão Crédito</SelectItem>
              <SelectItem value="debit_card">Cartão Débito</SelectItem>
              <SelectItem value="transfer">Transferência</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" data-testid="input-date-from" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" data-testid="input-date-to" />
        </div>
        {(filterType || filterPayment || dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterType(""); setFilterPayment(""); setDateFrom(""); setDateTo(""); }} data-testid="button-clear-filters">
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Transactions list */}
      {transactions.isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : !transactions.data?.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CreditCard className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma transação encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {(transactions.data ?? []).map((t) => {
              const cfg = TYPE_CONFIG[t.type] ?? TYPE_CONFIG.session;
              const Icon = cfg.icon;
              return (
                <div key={t.id} className="flex items-center gap-4 px-5 py-3.5" data-testid={`transaction-${t.id}`}>
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {cfg.label}
                      {t.plate && ` · ${t.plate}`}
                      {t.customerName && ` · ${t.customerName}`}
                      {t.paymentMethod && ` · ${PAYMENT_LABELS[t.paymentMethod] ?? t.paymentMethod}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-green-600">+{formatCurrency(t.amount)}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(t.date), "dd/MM HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
