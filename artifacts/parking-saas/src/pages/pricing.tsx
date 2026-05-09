import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Edit, Trash2, Settings2, Car, Bike, Truck, Bus,
  Clock, Calendar, DollarSign, AlertCircle, ChevronRight,
  Calculator, CheckCircle2, ArrowRight, Info, Zap, Shield,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const VEHICLE_TYPES = [
  { value: "car", label: "Carro", icon: Car, color: "text-blue-500" },
  { value: "motorcycle", label: "Moto", icon: Bike, color: "text-orange-500" },
  { value: "truck", label: "Caminhão", icon: Truck, color: "text-red-500" },
  { value: "van", label: "Van", icon: Bus, color: "text-purple-500" },
];

const RATE_TYPES = [
  { value: "hourly", label: "Por hora", desc: "Cobra um valor fixo por hora (ou fração)" },
  { value: "per_minute", label: "Por minuto", desc: "Cobra por cada minuto de permanência" },
  { value: "per_block", label: "Por bloco", desc: "Cobra por blocos de tempo (ex: R$5 a cada 30min)" },
];

const DAYS = [
  { value: 0, short: "Dom", full: "Domingo" },
  { value: 1, short: "Seg", full: "Segunda" },
  { value: 2, short: "Ter", full: "Terça" },
  { value: 3, short: "Qua", full: "Quarta" },
  { value: 4, short: "Qui", full: "Quinta" },
  { value: 5, short: "Sex", full: "Sexta" },
  { value: 6, short: "Sáb", full: "Sábado" },
];

interface PricingRule {
  id: number;
  name: string;
  description: string | null;
  vehicleTypes: string[];
  rateType: string;
  rateValue: number;
  blockMinutes: number | null;
  gracePeriodMinutes: number;
  minimumMinutes: number;
  minimumCharge: number | null;
  maxDailyCharge: number | null;
  roundUpBlock: boolean;
  timeFrom: string | null;
  timeTo: string | null;
  daysOfWeek: number[] | null;
  priority: number;
  isActive: boolean;
}

interface RuleFormValues {
  name: string;
  description: string;
  vehicleTypes: string[];
  rateType: string;
  rateValue: string;
  blockMinutes: string;
  gracePeriodMinutes: string;
  minimumMinutes: string;
  minimumCharge: string;
  maxDailyCharge: string;
  roundUpBlock: boolean;
  useTimeRestriction: boolean;
  timeFrom: string;
  timeTo: string;
  useDayRestriction: boolean;
  daysOfWeek: number[];
  priority: string;
  isActive: boolean;
}

interface SimulatorValues {
  vehicleType: string;
  entryDate: string;
  entryTime: string;
  exitDate: string;
  exitTime: string;
}

const PRICING_API = `${BASE_URL}/api/pricing-rules`;

function usePricingRules() {
  return useQuery<PricingRule[]>({
    queryKey: ["pricing-rules"],
    queryFn: async () => {
      const r = await fetch(PRICING_API);
      if (!r.ok) throw new Error("Erro ao carregar regras");
      return r.json();
    },
  });
}

function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: object) => {
      const r = await fetch(PRICING_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Erro ao criar");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing-rules"] }),
  });
}

function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: object }) => {
      const r = await fetch(`${PRICING_API}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Erro ao atualizar");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing-rules"] }),
  });
}

function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${PRICING_API}/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing-rules"] }),
  });
}

function useCalculatePrice() {
  return useMutation({
    mutationFn: async (data: object) => {
      const r = await fetch(`${BASE_URL}/api/pricing/calculate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Erro ao calcular");
      return r.json();
    },
  });
}

function rateLabel(rule: PricingRule) {
  if (rule.rateType === "hourly") return `${formatCurrency(rule.rateValue)}/hora`;
  if (rule.rateType === "per_minute") return `${formatCurrency(rule.rateValue)}/min`;
  return `${formatCurrency(rule.rateValue)}/${rule.blockMinutes ?? 60}min`;
}

function VehicleIcon({ type, className }: { type: string; className?: string }) {
  const cfg = VEHICLE_TYPES.find((v) => v.value === type);
  if (!cfg) return <Car className={className} />;
  return <cfg.icon className={className} />;
}

function RuleCard({
  rule, onEdit, onToggle, onDelete,
}: {
  rule: PricingRule;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const days = rule.daysOfWeek;
  const allDays = !days || days.length === 7;
  const weekend = days && days.length === 2 && days.includes(0) && days.includes(6);
  const weekdays = days && days.length === 5 && !days.includes(0) && !days.includes(6);

  return (
    <Card className={`transition-all border-l-4 ${rule.isActive ? "border-l-primary" : "border-l-muted opacity-60"}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Priority badge */}
          <div className="flex flex-col items-center shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{rule.priority}</span>
            </div>
            <span className="text-xs text-muted-foreground mt-1">prio</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">{rule.name}</h3>
              {!rule.isActive && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
            </div>
            {rule.description && <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>}

            <div className="flex flex-wrap gap-2 mt-3">
              {/* Vehicle types */}
              {rule.vehicleTypes.map((v) => {
                const cfg = VEHICLE_TYPES.find((t) => t.value === v);
                return (
                  <Badge key={v} variant="outline" className="gap-1 text-xs">
                    <VehicleIcon type={v} className={`w-3 h-3 ${cfg?.color}`} />
                    {cfg?.label ?? v}
                  </Badge>
                );
              })}

              {/* Rate */}
              <Badge className="gap-1 text-xs bg-primary/10 text-primary border-0 hover:bg-primary/20">
                <DollarSign className="w-3 h-3" />
                {rateLabel(rule)}
              </Badge>

              {/* Time */}
              {(rule.timeFrom || rule.timeTo) && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Clock className="w-3 h-3" />
                  {rule.timeFrom ?? "00:00"} – {rule.timeTo ?? "23:59"}
                </Badge>
              )}

              {/* Days */}
              {!allDays && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Calendar className="w-3 h-3" />
                  {weekend ? "Fim de semana" : weekdays ? "Dias úteis" : days!.map((d) => DAYS[d].short).join(", ")}
                </Badge>
              )}

              {/* Grace period */}
              {rule.gracePeriodMinutes > 0 && (
                <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-200">
                  <Shield className="w-3 h-3" />
                  {rule.gracePeriodMinutes}min grátis
                </Badge>
              )}

              {/* Max daily */}
              {rule.maxDailyCharge !== null && (
                <Badge variant="outline" className="gap-1 text-xs text-blue-600 border-blue-200">
                  <Zap className="w-3 h-3" />
                  Máx {formatCurrency(rule.maxDailyCharge)}/dia
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={rule.isActive} onCheckedChange={onToggle} aria-label="Ativar/Desativar" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const DEFAULT_FORM: RuleFormValues = {
  name: "", description: "", vehicleTypes: ["car"],
  rateType: "hourly", rateValue: "10", blockMinutes: "30",
  gracePeriodMinutes: "0", minimumMinutes: "0", minimumCharge: "", maxDailyCharge: "",
  roundUpBlock: true, useTimeRestriction: false, timeFrom: "08:00", timeTo: "22:00",
  useDayRestriction: false, daysOfWeek: [1, 2, 3, 4, 5],
  priority: "0", isActive: true,
};

function ruleToForm(rule: PricingRule): RuleFormValues {
  return {
    name: rule.name,
    description: rule.description ?? "",
    vehicleTypes: rule.vehicleTypes,
    rateType: rule.rateType,
    rateValue: String(rule.rateValue),
    blockMinutes: String(rule.blockMinutes ?? 30),
    gracePeriodMinutes: String(rule.gracePeriodMinutes),
    minimumMinutes: String(rule.minimumMinutes),
    minimumCharge: rule.minimumCharge !== null ? String(rule.minimumCharge) : "",
    maxDailyCharge: rule.maxDailyCharge !== null ? String(rule.maxDailyCharge) : "",
    roundUpBlock: rule.roundUpBlock,
    useTimeRestriction: !!(rule.timeFrom || rule.timeTo),
    timeFrom: rule.timeFrom ?? "08:00",
    timeTo: rule.timeTo ?? "22:00",
    useDayRestriction: !!(rule.daysOfWeek && rule.daysOfWeek.length > 0),
    daysOfWeek: rule.daysOfWeek ?? [1, 2, 3, 4, 5],
    priority: String(rule.priority),
    isActive: rule.isActive,
  };
}

function formToPayload(data: RuleFormValues) {
  return {
    name: data.name,
    description: data.description || undefined,
    vehicleTypes: data.vehicleTypes,
    rateType: data.rateType,
    rateValue: parseFloat(data.rateValue) || 0,
    blockMinutes: parseInt(data.blockMinutes) || 30,
    gracePeriodMinutes: parseInt(data.gracePeriodMinutes) || 0,
    minimumMinutes: parseInt(data.minimumMinutes) || 0,
    minimumCharge: data.minimumCharge ? parseFloat(data.minimumCharge) : undefined,
    maxDailyCharge: data.maxDailyCharge ? parseFloat(data.maxDailyCharge) : undefined,
    roundUpBlock: data.roundUpBlock,
    timeFrom: data.useTimeRestriction ? data.timeFrom : undefined,
    timeTo: data.useTimeRestriction ? data.timeTo : undefined,
    daysOfWeek: data.useDayRestriction ? data.daysOfWeek : undefined,
    priority: parseInt(data.priority) || 0,
    isActive: data.isActive,
  };
}

export default function Pricing() {
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState<PricingRule | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<PricingRule | null>(null);
  const { toast } = useToast();

  const rules = usePricingRules();
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();
  const calculate = useCalculatePrice();

  const form = useForm<RuleFormValues>({ defaultValues: DEFAULT_FORM });
  const simForm = useForm<SimulatorValues>({
    defaultValues: {
      vehicleType: "car",
      entryDate: new Date().toISOString().split("T")[0],
      entryTime: "08:00",
      exitDate: new Date().toISOString().split("T")[0],
      exitTime: "10:00",
    },
  });

  const watchedVehicleTypes = form.watch("vehicleTypes");
  const watchedRateType = form.watch("rateType");
  const watchedUseTime = form.watch("useTimeRestriction");
  const watchedUseDays = form.watch("useDayRestriction");
  const watchedDays = form.watch("daysOfWeek");

  function openCreate() {
    form.reset(DEFAULT_FORM);
    setEditRule(null);
    setShowForm(true);
  }

  function openEdit(rule: PricingRule) {
    form.reset(ruleToForm(rule));
    setEditRule(rule);
    setShowForm(true);
  }

  function toggleVehicle(type: string) {
    const cur = form.getValues("vehicleTypes");
    if (cur.includes(type)) {
      if (cur.length > 1) form.setValue("vehicleTypes", cur.filter((t) => t !== type));
    } else {
      form.setValue("vehicleTypes", [...cur, type]);
    }
  }

  function toggleDay(day: number) {
    const cur = form.getValues("daysOfWeek") ?? [];
    if (cur.includes(day)) {
      form.setValue("daysOfWeek", cur.filter((d) => d !== day));
    } else {
      form.setValue("daysOfWeek", [...cur, day]);
    }
  }

  function selectAllWeekdays() {
    form.setValue("daysOfWeek", [1, 2, 3, 4, 5]);
  }

  function selectWeekend() {
    form.setValue("daysOfWeek", [0, 6]);
  }

  function selectAllDays() {
    form.setValue("daysOfWeek", [0, 1, 2, 3, 4, 5, 6]);
  }

  const onSubmit = form.handleSubmit((data) => {
    const payload = formToPayload(data);

    if (editRule) {
      updateRule.mutate({ id: editRule.id, data: payload }, {
        onSuccess: () => { toast({ title: "Regra atualizada" }); setShowForm(false); },
        onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
      });
    } else {
      createRule.mutate(payload, {
        onSuccess: () => { toast({ title: "Regra criada" }); setShowForm(false); },
        onError: () => toast({ title: "Erro ao criar", variant: "destructive" }),
      });
    }
  });

  const onToggle = (rule: PricingRule) => {
    updateRule.mutate({ id: rule.id, data: { isActive: !rule.isActive } }, {
      onSuccess: () => toast({ title: rule.isActive ? "Regra desativada" : "Regra ativada" }),
    });
  };

  const onDelete = () => {
    if (!deleteConfirm) return;
    deleteRule.mutate(deleteConfirm.id, {
      onSuccess: () => { toast({ title: "Regra removida" }); setDeleteConfirm(null); },
    });
  };

  const onSimulate = simForm.handleSubmit((data) => {
    const entryTime = `${data.entryDate}T${data.entryTime}:00`;
    const exitTime = `${data.exitDate}T${data.exitTime}:00`;
    calculate.mutate({ vehicleType: data.vehicleType, entryTime, exitTime });
  });

  const simResult = calculate.data as any;

  const activeRules = rules.data?.filter((r) => r.isActive) ?? [];
  const inactiveRules = rules.data?.filter((r) => !r.isActive) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuração de Preços</h1>
          <p className="text-sm text-muted-foreground">Defina regras de cobrança flexíveis por tipo de veículo, horário e dia</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-rule">
          <Plus className="w-4 h-4 mr-2" /> Nova Regra
        </Button>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">
            <Settings2 className="w-4 h-4 mr-2" /> Regras
          </TabsTrigger>
          <TabsTrigger value="simulator">
            <Calculator className="w-4 h-4 mr-2" /> Simulador
          </TabsTrigger>
        </TabsList>

        {/* ─── Rules tab ─── */}
        <TabsContent value="rules" className="space-y-6 mt-6">
          {/* Info banner */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Como funciona a prioridade</p>
                <p className="text-muted-foreground mt-0.5">
                  Quando um veículo sai, o sistema aplica a regra ativa de <strong>maior prioridade</strong> que corresponda ao tipo de veículo, horário e dia da semana.
                  Use prioridades maiores para regras específicas (ex: tarifa de madrugada) e menores para regras genéricas.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Active rules */}
          {rules.isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : !rules.data?.length ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Settings2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma regra de preço cadastrada</p>
                <Button className="mt-4" onClick={openCreate}>
                  <Plus className="w-4 h-4 mr-2" /> Criar primeira regra
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeRules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onEdit={() => openEdit(rule)}
                  onToggle={() => onToggle(rule)}
                  onDelete={() => setDeleteConfirm(rule)}
                />
              ))}
              {inactiveRules.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">Inativas</p>
                  {inactiveRules.map((rule) => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      onEdit={() => openEdit(rule)}
                      onToggle={() => onToggle(rule)}
                      onDelete={() => setDeleteConfirm(rule)}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </TabsContent>

        {/* ─── Simulator tab ─── */}
        <TabsContent value="simulator" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" />
                  Simular Cobrança
                </CardTitle>
                <CardDescription>Calcule o valor que seria cobrado para um veículo</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSimulate} className="space-y-5">
                  <div className="space-y-2">
                    <Label>Tipo de Veículo</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {VEHICLE_TYPES.map((v) => (
                        <button
                          key={v.value}
                          type="button"
                          onClick={() => simForm.setValue("vehicleType", v.value)}
                          className={`p-3 rounded-lg border text-center transition-all ${simForm.watch("vehicleType") === v.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                          data-testid={`sim-vehicle-${v.value}`}
                        >
                          <v.icon className={`w-6 h-6 mx-auto mb-1 ${v.color}`} />
                          <span className="text-xs font-medium">{v.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data entrada</Label>
                      <Input type="date" {...simForm.register("entryDate")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Hora entrada</Label>
                      <Input type="time" {...simForm.register("entryTime")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data saída</Label>
                      <Input type="date" {...simForm.register("exitDate")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Hora saída</Label>
                      <Input type="time" {...simForm.register("exitTime")} />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={calculate.isPending} data-testid="button-simulate">
                    <Calculator className="w-4 h-4 mr-2" />
                    {calculate.isPending ? "Calculando..." : "Calcular Valor"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Result */}
            <div className="space-y-4">
              {!simResult && !calculate.isPending && (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center py-16">
                    <Calculator className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Preencha os dados e clique em calcular</p>
                  </CardContent>
                </Card>
              )}

              {simResult && (
                <>
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Valor a cobrar</span>
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-4xl font-bold text-primary" data-testid="sim-result-amount">{formatCurrency(simResult.amount)}</p>
                      <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Duração</span>
                          <span className="font-medium">{simResult.durationMinutes} min ({Math.floor(simResult.durationMinutes / 60)}h {simResult.durationMinutes % 60}min)</span>
                        </div>
                        {simResult.matchedRule ? (
                          <div className="flex justify-between">
                            <span>Regra aplicada</span>
                            <span className="font-medium text-primary">{simResult.matchedRule.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-yellow-600">
                            <AlertCircle className="w-3 h-3" />
                            <span>Nenhuma regra encontrada — valor zerado</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {simResult.allMatchingRules?.length > 1 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Todas as regras compatíveis</CardTitle>
                        <CardDescription className="text-xs">Ordenadas por prioridade — a primeira é aplicada</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {simResult.allMatchingRules.map((r: any, i: number) => (
                          <div key={r.id} className={`flex items-center justify-between p-2 rounded-md text-sm ${i === 0 ? "bg-primary/5 border border-primary/20" : "bg-muted/50"}`}>
                            <div className="flex items-center gap-2">
                              {i === 0 && <CheckCircle2 className="w-3 h-3 text-primary" />}
                              <span className={i === 0 ? "font-medium" : "text-muted-foreground"}>{r.name}</span>
                            </div>
                            <span className={i === 0 ? "font-bold text-primary" : "text-muted-foreground"}>{formatCurrency(r.amount)}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Rule Form Dialog ─── */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRule ? "Editar Regra" : "Nova Regra de Preço"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-6 py-2">
            {/* Basic info */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome da regra *</Label>
                <Input {...form.register("name", { required: true })} placeholder="Ex: Carro Horário Comercial" data-testid="input-rule-name" />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input {...form.register("description")} placeholder="Opcional — aparece no card da regra" data-testid="input-rule-description" />
              </div>
            </div>

            <Separator />

            {/* Vehicle types */}
            <div className="space-y-3">
              <Label>Tipos de veículo *</Label>
              <div className="grid grid-cols-4 gap-2">
                {VEHICLE_TYPES.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => toggleVehicle(v.value)}
                    data-testid={`vehicle-toggle-${v.value}`}
                    className={`p-3 rounded-lg border text-center transition-all ${watchedVehicleTypes.includes(v.value) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  >
                    <v.icon className={`w-5 h-5 mx-auto mb-1 ${v.color}`} />
                    <span className="text-xs font-medium">{v.label}</span>
                    {watchedVehicleTypes.includes(v.value) && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Rate configuration */}
            <div className="space-y-4">
              <Label>Forma de Cobrança</Label>
              <div className="grid grid-cols-1 gap-2">
                {RATE_TYPES.map((rt) => (
                  <label
                    key={rt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${form.watch("rateType") === rt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  >
                    <input
                      type="radio"
                      className="mt-1"
                      checked={form.watch("rateType") === rt.value}
                      onChange={() => form.setValue("rateType", rt.value)}
                      data-testid={`radio-rate-${rt.value}`}
                    />
                    <div>
                      <p className="text-sm font-medium">{rt.label}</p>
                      <p className="text-xs text-muted-foreground">{rt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Valor (R$) *</Label>
                  <Input
                    {...form.register("rateValue", { required: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 10.00"
                    data-testid="input-rate-value"
                  />
                  <p className="text-xs text-muted-foreground">
                    {watchedRateType === "hourly" ? "Por hora" : watchedRateType === "per_minute" ? "Por minuto" : "Por bloco de tempo"}
                  </p>
                </div>
                {watchedRateType === "per_block" && (
                  <div className="space-y-1.5">
                    <Label>Tamanho do bloco (minutos)</Label>
                    <Input {...form.register("blockMinutes")} type="number" min="1" placeholder="30" data-testid="input-block-minutes" />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">Arredondar para cima</p>
                  <p className="text-xs text-muted-foreground">Cobra sempre a fração completa (ex: 1h10min → 2h)</p>
                </div>
                <Controller
                  control={form.control}
                  name="roundUpBlock"
                  render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-round-up" />}
                />
              </div>
            </div>

            <Separator />

            {/* Minimums and maximums */}
            <div className="space-y-3">
              <Label>Limites e franquias</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Franquia (minutos grátis)</Label>
                  <Input {...form.register("gracePeriodMinutes")} type="number" min="0" placeholder="0" data-testid="input-grace" />
                  <p className="text-xs text-muted-foreground">Ex: 15 = primeiros 15min sem cobrança</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tempo mínimo cobrado (min)</Label>
                  <Input {...form.register("minimumMinutes")} type="number" min="0" placeholder="0" data-testid="input-min-minutes" />
                  <p className="text-xs text-muted-foreground">Ex: 60 = cobra no mínimo 1 hora</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor mínimo (R$)</Label>
                  <Input {...form.register("minimumCharge")} type="number" step="0.01" min="0" placeholder="Opcional" data-testid="input-min-charge" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Teto diário (R$)</Label>
                  <Input {...form.register("maxDailyCharge")} type="number" step="0.01" min="0" placeholder="Opcional" data-testid="input-max-charge" />
                  <p className="text-xs text-muted-foreground">Valor máximo por sessão</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Time restriction */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Restrição de horário</Label>
                  <p className="text-xs text-muted-foreground">Aplicar apenas em determinados horários</p>
                </div>
                <Controller
                  control={form.control}
                  name="useTimeRestriction"
                  render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-time-restriction" />}
                />
              </div>
              {watchedUseTime && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/30">
                  <div className="space-y-1.5">
                    <Label className="text-xs">De</Label>
                    <Input type="time" {...form.register("timeFrom")} data-testid="input-time-from" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Até</Label>
                    <Input type="time" {...form.register("timeTo")} data-testid="input-time-to" />
                  </div>
                </div>
              )}
            </div>

            {/* Day restriction */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Restrição de dia da semana</Label>
                  <p className="text-xs text-muted-foreground">Aplicar apenas em certos dias</p>
                </div>
                <Controller
                  control={form.control}
                  name="useDayRestriction"
                  render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-day-restriction" />}
                />
              </div>
              {watchedUseDays && (
                <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                  <div className="flex gap-2 flex-wrap">
                    <Button type="button" size="sm" variant="outline" onClick={selectAllWeekdays} className="text-xs h-7">Dias úteis</Button>
                    <Button type="button" size="sm" variant="outline" onClick={selectWeekend} className="text-xs h-7">Fim de semana</Button>
                    <Button type="button" size="sm" variant="outline" onClick={selectAllDays} className="text-xs h-7">Todos</Button>
                  </div>
                  <div className="flex gap-2">
                    {DAYS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        data-testid={`day-toggle-${d.value}`}
                        className={`w-9 h-9 rounded-full text-xs font-medium transition-all ${watchedDays?.includes(d.value) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/20"}`}
                      >
                        {d.short}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Priority and status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Input {...form.register("priority")} type="number" min="0" placeholder="0" data-testid="input-priority" />
                <p className="text-xs text-muted-foreground">Maior número = maior prioridade</p>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <div className="flex items-center gap-3 h-10">
                  <Controller
                    control={form.control}
                    name="isActive"
                    render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-is-active" />}
                  />
                  <span className="text-sm">{form.watch("isActive") ? "Ativa" : "Inativa"}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={createRule.isPending || updateRule.isPending} data-testid="button-submit-rule">
                {(createRule.isPending || updateRule.isPending) ? "Salvando..." : editRule ? "Salvar alterações" : "Criar regra"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover regra</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover a regra <strong>"{deleteConfirm?.name}"</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={onDelete} disabled={deleteRule.isPending} data-testid="button-confirm-delete">
              {deleteRule.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
