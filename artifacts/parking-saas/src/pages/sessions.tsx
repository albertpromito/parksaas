import { useState, useEffect, useRef } from "react";
import { useListSessions, useCreateSession, useUpdateSession, useListSpots, getListSessionsQueryKey, getGetDashboardSummaryQueryKey, getListSpotsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import {
  Plus, Car, Clock, DollarSign, LogOut, Bike, Truck, Bus,
  CheckCircle2, AlertCircle, Loader2, Pencil, RotateCcw,
  Shield, Zap,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  car: "Carro", motorcycle: "Moto", truck: "Caminhão", van: "Van",
};

const VEHICLE_ICONS: Record<string, React.ElementType> = {
  car: Car, motorcycle: Bike, truck: Truck, van: Bus,
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Dinheiro", credit_card: "Cartão Crédito", debit_card: "Cartão Débito",
  pix: "PIX", transfer: "Transferência",
};

interface EntryForm {
  plate: string;
  vehicleType: string;
  vehicleColor: string;
  vehicleBrand: string;
  driverName: string;
  spotId: string;
}

interface ExitForm {
  amount: string;
  paymentMethod: string;
}

interface ExitSession {
  id: number;
  plate: string;
  vehicleType: string;
  entryTime: string;
  driverName?: string | null;
}

interface PricePreview {
  amount: number;
  durationMinutes: number;
  matchedRule: { id: number; name: string } | null;
  allMatchingRules: Array<{ id: number; name: string; amount: number }>;
  loading: boolean;
  error: boolean;
  overridden: boolean;
}

async function fetchPricePreview(
  vehicleType: string,
  entryTime: string,
): Promise<Omit<PricePreview, "loading" | "error" | "overridden">> {
  const exitTime = new Date().toISOString();
  const r = await fetch(`${BASE_URL}/api/pricing/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicleType, entryTime, exitTime }),
  });
  if (!r.ok) throw new Error("Falha ao calcular preço");
  return r.json();
}

export default function Sessions() {
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [showEntry, setShowEntry] = useState(false);
  const [exitSession, setExitSession] = useState<ExitSession | null>(null);
  const [pricePreview, setPricePreview] = useState<PricePreview | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();
  const calcTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const sessions = useListSessions({ status: filterStatus as any, limit: 100 });
  const spots = useListSpots({ status: "available" });
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();

  const entryForm = useForm<EntryForm>({
    defaultValues: { plate: "", vehicleType: "car", vehicleColor: "", vehicleBrand: "", driverName: "", spotId: "" },
  });
  const exitForm = useForm<ExitForm>({ defaultValues: { amount: "", paymentMethod: "pix" } });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    qc.invalidateQueries({ queryKey: getListSpotsQueryKey() });
  };

  // When exit dialog opens: fetch price immediately, then refresh every 60s
  useEffect(() => {
    if (!exitSession) {
      setPricePreview(null);
      if (calcTimer.current) clearInterval(calcTimer.current);
      return;
    }

    async function refresh() {
      if (!exitSession) return;
      try {
        const result = await fetchPricePreview(exitSession.vehicleType, exitSession.entryTime);
        setPricePreview((prev) => {
          // Don't overwrite amount if operator already overrode it
          if (prev?.overridden) return { ...prev, durationMinutes: result.durationMinutes, matchedRule: result.matchedRule, allMatchingRules: result.allMatchingRules, loading: false, error: false };
          exitForm.setValue("amount", String(result.amount));
          return { ...result, loading: false, error: false, overridden: false };
        });
      } catch {
        setPricePreview((prev) => prev ? { ...prev, loading: false, error: true } : null);
      }
    }

    setPricePreview({ amount: 0, durationMinutes: 0, matchedRule: null, allMatchingRules: [], loading: true, error: false, overridden: false });
    refresh();
    calcTimer.current = setInterval(refresh, 60_000);
    return () => { if (calcTimer.current) clearInterval(calcTimer.current); };
  }, [exitSession?.id]);

  function openExit(s: ExitSession) {
    exitForm.reset({ amount: "", paymentMethod: "pix" });
    setExitSession(s);
  }

  function handleAmountChange(v: string) {
    exitForm.setValue("amount", v);
    if (pricePreview) {
      setPricePreview((prev) => prev ? { ...prev, overridden: true } : null);
    }
  }

  function resetToCalculated() {
    if (!pricePreview) return;
    exitForm.setValue("amount", String(pricePreview.amount));
    setPricePreview((prev) => prev ? { ...prev, overridden: false } : null);
  }

  const onEntry = (data: EntryForm) => {
    const plate = data.plate.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    createSession.mutate({
      data: {
        plate,
        vehicleType: data.vehicleType as any,
        vehicleColor: data.vehicleColor || undefined,
        vehicleBrand: data.vehicleBrand || undefined,
        driverName: data.driverName || undefined,
        spotId: data.spotId ? parseInt(data.spotId) : undefined,
      },
    }, {
      onSuccess: () => {
        toast({ title: `Entrada registrada — ${plate}` });
        setShowEntry(false);
        entryForm.reset();
        invalidate();
      },
      onError: () => toast({ title: "Erro ao registrar entrada", variant: "destructive" }),
    });
  };

  const onExit = exitForm.handleSubmit((data) => {
    if (!exitSession) return;
    const amountVal = parseFloat(data.amount) || 0;
    updateSession.mutate({
      id: exitSession.id,
      data: {
        status: "completed",
        amount: amountVal,
        paymentMethod: data.paymentMethod as any,
        exitTime: new Date().toISOString(),
      },
    }, {
      onSuccess: () => {
        toast({ title: `Saída registrada — ${exitSession.plate}`, description: amountVal > 0 ? `Valor cobrado: ${formatCurrency(amountVal)}` : "Sem cobrança" });
        setExitSession(null);
        exitForm.reset();
        invalidate();
      },
      onError: () => toast({ title: "Erro ao registrar saída", variant: "destructive" }),
    });
  });

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Movimentos</h1>
          <p className="text-sm text-muted-foreground">Entradas e saídas de veículos</p>
        </div>
        <Button onClick={() => setShowEntry(true)} data-testid="button-register-entry">
          <Plus className="w-4 h-4 mr-2" /> Registrar Entrada
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[{ key: "active", label: "Ativos" }, { key: "completed", label: "Concluídos" }, { key: "", label: "Todos" }].map((f) => (
          <Button
            key={f.key}
            variant={filterStatus === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(f.key)}
            data-testid={`filter-${f.label.toLowerCase()}`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Sessions list */}
      {sessions.isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : !sessions.data?.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Car className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum movimento encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(sessions.data ?? []).map((session) => {
            const VIcon = VEHICLE_ICONS[session.vehicleType] ?? Car;
            return (
              <Card key={session.id} data-testid={`session-${session.id}`} className="hover:border-border/80 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${session.status === "active" ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"}`}>
                      <VIcon className={`w-5 h-5 ${session.status === "active" ? "text-green-600" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm font-mono">{session.plate}</span>
                        {session.isSubscriber && <Badge variant="outline" className="text-xs">Mensalista</Badge>}
                        <Badge variant={session.status === "active" ? "default" : "secondary"} className="text-xs">
                          {session.status === "active" ? "Ativo" : session.status === "completed" ? "Concluído" : "Cancelado"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {VEHICLE_TYPE_LABELS[session.vehicleType] ?? session.vehicleType}
                        {session.vehicleBrand && ` · ${session.vehicleBrand}`}
                        {session.vehicleColor && ` · ${session.vehicleColor}`}
                        {session.driverName && ` · ${session.driverName}`}
                        {session.spotNumber && ` · Vaga ${session.spotNumber}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 shrink-0 text-right">
                      <div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>Entrada</span>
                        </div>
                        <p className="text-xs font-medium">{format(new Date(session.entryTime), "dd/MM HH:mm")}</p>
                        {session.status === "active" && (
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(session.entryTime), { addSuffix: false, locale: ptBR })}
                          </p>
                        )}
                      </div>
                      {session.amount != null && (
                        <div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <DollarSign className="w-3 h-3" />
                            <span>Valor</span>
                          </div>
                          <p className="text-sm font-bold">{formatCurrency(session.amount)}</p>
                          {session.paymentMethod && (
                            <p className="text-xs text-muted-foreground">{PAYMENT_LABELS[session.paymentMethod] ?? session.paymentMethod}</p>
                          )}
                        </div>
                      )}
                      {session.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => openExit({
                            id: session.id,
                            plate: session.plate,
                            vehicleType: session.vehicleType,
                            entryTime: session.entryTime as string,
                            driverName: session.driverName,
                          })}
                          data-testid={`button-exit-${session.id}`}
                        >
                          <LogOut className="w-3 h-3" /> Saída
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Entry dialog */}
      <Dialog open={showEntry} onOpenChange={setShowEntry}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Entrada</DialogTitle></DialogHeader>
          <form onSubmit={entryForm.handleSubmit(onEntry)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Placa *</Label>
                <Input
                  {...entryForm.register("plate", { required: true })}
                  placeholder="ABC-1234"
                  className="uppercase"
                  data-testid="input-plate"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de Veículo *</Label>
                <Select value={entryForm.watch("vehicleType")} onValueChange={(v) => entryForm.setValue("vehicleType", v)}>
                  <SelectTrigger data-testid="select-vehicle-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Carro</SelectItem>
                    <SelectItem value="motorcycle">Moto</SelectItem>
                    <SelectItem value="truck">Caminhão</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Vaga</Label>
                <Select value={entryForm.watch("spotId") || "auto"} onValueChange={(v) => entryForm.setValue("spotId", v === "auto" ? "" : v)}>
                  <SelectTrigger data-testid="select-spot"><SelectValue placeholder="Automático" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automático</SelectItem>
                    {(spots.data ?? []).map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>Vaga {s.number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Marca</Label>
                <Input {...entryForm.register("vehicleBrand")} placeholder="Ex: Toyota" data-testid="input-brand" />
              </div>
              <div className="space-y-1.5">
                <Label>Cor</Label>
                <Input {...entryForm.register("vehicleColor")} placeholder="Ex: Prata" data-testid="input-color" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Nome do Motorista</Label>
                <Input {...entryForm.register("driverName")} placeholder="Opcional" data-testid="input-driver" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEntry(false)}>Cancelar</Button>
              <Button type="submit" disabled={createSession.isPending} data-testid="button-confirm-entry">
                {createSession.isPending ? "Registrando..." : "Registrar Entrada"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Exit dialog */}
      <Dialog open={!!exitSession} onOpenChange={(o) => { if (!o) setExitSession(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-primary" />
              Registrar Saída — {exitSession?.plate}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={onExit} className="space-y-5 py-2">
            {/* Session info */}
            {exitSession && (
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                <span>
                  {VEHICLE_TYPE_LABELS[exitSession.vehicleType] ?? exitSession.vehicleType}
                  {exitSession.driverName && ` · ${exitSession.driverName}`}
                </span>
                <span>
                  Entrada: {format(new Date(exitSession.entryTime), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}

            {/* Price preview */}
            {pricePreview && (
              <div className={`rounded-lg border p-4 space-y-3 transition-all ${pricePreview.error ? "border-destructive/30 bg-destructive/5" : pricePreview.loading ? "border-border bg-muted/20" : "border-primary/30 bg-primary/5"}`}>
                {pricePreview.loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Calculando valor...
                  </div>
                ) : pricePreview.error ? (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    Não foi possível calcular — informe o valor manualmente
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Valor calculado</p>
                        <p className="text-3xl font-bold text-primary" data-testid="calculated-amount">
                          {formatCurrency(pricePreview.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.floor(pricePreview.durationMinutes / 60)}h {pricePreview.durationMinutes % 60}min de permanência
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {pricePreview.matchedRule ? (
                          <Badge className="gap-1 bg-primary/10 text-primary border-0 hover:bg-primary/20 text-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            {pricePreview.matchedRule.name}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs text-yellow-600 border-yellow-300">
                            <AlertCircle className="w-3 h-3" />
                            Sem regra
                          </Badge>
                        )}
                      </div>
                    </div>

                    {pricePreview.overridden && (
                      <div className="flex items-center justify-between text-xs bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md px-3 py-2">
                        <span className="flex items-center gap-1 text-yellow-700 dark:text-yellow-400">
                          <Pencil className="w-3 h-3" />
                          Valor editado manualmente
                        </span>
                        <button
                          type="button"
                          onClick={resetToCalculated}
                          className="flex items-center gap-1 text-primary hover:underline font-medium"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restaurar
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <Separator />

            {/* Amount override + payment */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  Valor cobrado (R$)
                  {pricePreview && !pricePreview.loading && !pricePreview.overridden && (
                    <span className="text-xs text-muted-foreground font-normal">· auto</span>
                  )}
                </Label>
                <Input
                  value={exitForm.watch("amount")}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  data-testid="input-amount"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Forma de Pagamento</Label>
                <Select value={exitForm.watch("paymentMethod")} onValueChange={(v) => exitForm.setValue("paymentMethod", v)}>
                  <SelectTrigger data-testid="select-payment"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="credit_card">Cartão Crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão Débito</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExitSession(null)}>Cancelar</Button>
              <Button type="submit" disabled={updateSession.isPending} data-testid="button-confirm-exit">
                {updateSession.isPending ? "Registrando..." : "Confirmar Saída"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
