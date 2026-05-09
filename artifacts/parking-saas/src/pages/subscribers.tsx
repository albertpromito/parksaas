import { useState } from "react";
import { useListSubscribers, useCreateSubscriber, useUpdateSubscriber, useDeleteSubscriber, useListPlans, getListSubscribersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { Plus, Users, Search, AlertTriangle, Trash2, Edit } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  expired: { label: "Vencido", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "secondary" },
  pending: { label: "Pendente", variant: "outline" },
};

const VEHICLE_TYPES = [{ value: "car", label: "Carro" }, { value: "motorcycle", label: "Moto" }, { value: "truck", label: "Caminhão" }, { value: "van", label: "Van" }];
const PAYMENT_METHODS = [{ value: "pix", label: "PIX" }, { value: "cash", label: "Dinheiro" }, { value: "credit_card", label: "Cartão Crédito" }, { value: "debit_card", label: "Cartão Débito" }, { value: "transfer", label: "Transferência" }];

interface SubscriberForm {
  name: string; email: string; phone: string; cpf: string;
  planId: string; plate: string; vehicleType: string;
  vehicleColor: string; vehicleBrand: string; startDate: string;
  paymentMethod: string; notes: string;
}

export default function Subscribers() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);
  const [editSub, setEditSub] = useState<any>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const today = new Date().toISOString().split("T")[0];

  const subscribers = useListSubscribers({ ...(filterStatus ? { status: filterStatus as any } : {}), ...(search ? { search } : {}) });
  const plans = useListPlans();
  const createSubscriber = useCreateSubscriber();
  const updateSubscriber = useUpdateSubscriber();
  const deleteSubscriber = useDeleteSubscriber();

  const form = useForm<SubscriberForm>({
    defaultValues: { name: "", email: "", phone: "", cpf: "", planId: "", plate: "", vehicleType: "car", vehicleColor: "", vehicleBrand: "", startDate: today, paymentMethod: "pix", notes: "" },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListSubscribersQueryKey() });

  const onSubmit = (data: SubscriberForm) => {
    createSubscriber.mutate({
      data: {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        cpf: data.cpf || undefined,
        planId: parseInt(data.planId),
        plate: data.plate.toUpperCase(),
        vehicleType: data.vehicleType as any,
        vehicleColor: data.vehicleColor || undefined,
        vehicleBrand: data.vehicleBrand || undefined,
        startDate: data.startDate,
        paymentMethod: data.paymentMethod as any,
        notes: data.notes || undefined,
      },
    }, {
      onSuccess: () => { toast({ title: "Mensalista cadastrado" }); setShowAdd(false); form.reset(); invalidate(); },
      onError: () => toast({ title: "Erro ao cadastrar", variant: "destructive" }),
    });
  };

  const cancelSubscriber = (id: number) => {
    updateSubscriber.mutate({ id, data: { status: "cancelled" } }, {
      onSuccess: () => { toast({ title: "Mensalista cancelado" }); invalidate(); },
      onError: () => toast({ title: "Erro ao cancelar", variant: "destructive" }),
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mensalistas</h1>
          <p className="text-sm text-muted-foreground">Gerenciamento de assinantes mensais</p>
        </div>
        <Button onClick={() => { form.reset({ startDate: today }); setShowAdd(true); }} data-testid="button-add-subscriber">
          <Plus className="w-4 h-4 mr-2" /> Novo Mensalista
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou placa..." className="pl-9" data-testid="input-search-subscriber" />
        </div>
        <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40" data-testid="select-subscriber-status">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="expired">Vencidos</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {subscribers.isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : !subscribers.data?.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum mensalista encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(subscribers.data ?? []).map((sub) => {
            const daysLeft = differenceInDays(new Date(sub.endDate), new Date());
            const isExpiringSoon = sub.status === "active" && daysLeft <= 7 && daysLeft >= 0;
            const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.active;
            return (
              <Card key={sub.id} data-testid={`subscriber-${sub.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{sub.name[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{sub.name}</span>
                        <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                        {isExpiringSoon && (
                          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Vence em {daysLeft}d
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono font-medium">{sub.plate}</span>
                        {sub.vehicleBrand && ` · ${sub.vehicleBrand}`}
                        {sub.vehicleColor && ` · ${sub.vehicleColor}`}
                        {` · Plano ${sub.planName}`}
                      </p>
                      {sub.email && <p className="text-xs text-muted-foreground">{sub.email}{sub.phone && ` · ${sub.phone}`}</p>}
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-sm font-bold">{formatCurrency(sub.amount)}/mês</p>
                      <p className="text-xs text-muted-foreground">
                        Até {format(new Date(sub.endDate + "T00:00:00"), "dd/MM/yyyy")}
                      </p>
                      <div className="flex gap-2 justify-end">
                        {sub.status === "active" && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => cancelSubscriber(sub.id)} data-testid={`button-cancel-${sub.id}`}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Mensalista</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Nome completo *</Label>
                <Input {...form.register("name", { required: true })} placeholder="Nome do cliente" data-testid="input-subscriber-name" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input {...form.register("email")} type="email" placeholder="email@exemplo.com" data-testid="input-subscriber-email" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input {...form.register("phone")} placeholder="(11) 99999-9999" data-testid="input-subscriber-phone" />
              </div>
              <div className="space-y-1.5">
                <Label>CPF/CNPJ</Label>
                <Input {...form.register("cpf")} placeholder="000.000.000-00" data-testid="input-subscriber-cpf" />
              </div>
              <div className="space-y-1.5">
                <Label>Plano *</Label>
                <Select value={form.watch("planId")} onValueChange={(v) => form.setValue("planId", v)}>
                  <SelectTrigger data-testid="select-subscriber-plan"><SelectValue placeholder="Selecionar plano" /></SelectTrigger>
                  <SelectContent>
                    {(plans.data ?? []).filter((p) => p.isActive).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name} — {formatCurrency(p.price)}/mês</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Placa *</Label>
                <Input {...form.register("plate", { required: true })} placeholder="ABC-1234" className="uppercase" data-testid="input-subscriber-plate" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de Veículo</Label>
                <Select value={form.watch("vehicleType")} onValueChange={(v) => form.setValue("vehicleType", v)}>
                  <SelectTrigger data-testid="select-subscriber-vehicle"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Marca</Label>
                <Input {...form.register("vehicleBrand")} placeholder="Ex: Toyota" data-testid="input-subscriber-brand" />
              </div>
              <div className="space-y-1.5">
                <Label>Cor</Label>
                <Input {...form.register("vehicleColor")} placeholder="Ex: Prata" data-testid="input-subscriber-color" />
              </div>
              <div className="space-y-1.5">
                <Label>Data de Início</Label>
                <Input {...form.register("startDate")} type="date" data-testid="input-subscriber-start" />
              </div>
              <div className="space-y-1.5">
                <Label>Forma de Pagamento</Label>
                <Select value={form.watch("paymentMethod")} onValueChange={(v) => form.setValue("paymentMethod", v)}>
                  <SelectTrigger data-testid="select-subscriber-payment"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Observações</Label>
                <Input {...form.register("notes")} placeholder="Opcional" data-testid="input-subscriber-notes" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button type="submit" disabled={createSubscriber.isPending} data-testid="button-submit-subscriber">
                {createSubscriber.isPending ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
