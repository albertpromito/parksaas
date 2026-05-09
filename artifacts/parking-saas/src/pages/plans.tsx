import { useState } from "react";
import { useListPlans, useCreatePlan, useUpdatePlan, useDeletePlan, getListPlansQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { Plus, ScrollText, Edit, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const VEHICLE_TYPE_OPTIONS = [
  { value: "car", label: "Carro" },
  { value: "motorcycle", label: "Moto" },
  { value: "truck", label: "Caminhão" },
  { value: "van", label: "Van" },
];

interface PlanForm {
  name: string; description: string; price: string; durationDays: string; maxVehicles: string; isActive: boolean; vehicleTypes: string[];
}

export default function Plans() {
  const [showAdd, setShowAdd] = useState(false);
  const [editPlan, setEditPlan] = useState<any>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const plans = useListPlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const form = useForm<PlanForm>({
    defaultValues: { name: "", description: "", price: "", durationDays: "30", maxVehicles: "1", isActive: true, vehicleTypes: ["car"] },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListPlansQueryKey() });

  const onSubmit = (data: PlanForm) => {
    const payload = {
      name: data.name,
      description: data.description || undefined,
      price: parseFloat(data.price),
      durationDays: parseInt(data.durationDays),
      maxVehicles: parseInt(data.maxVehicles),
      isActive: data.isActive,
      vehicleTypes: data.vehicleTypes,
    };

    if (editPlan) {
      updatePlan.mutate({ id: editPlan.id, data: payload }, {
        onSuccess: () => { toast({ title: "Plano atualizado" }); setEditPlan(null); form.reset(); invalidate(); },
        onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
      });
    } else {
      createPlan.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "Plano criado" }); setShowAdd(false); form.reset(); invalidate(); },
        onError: () => toast({ title: "Erro ao criar", variant: "destructive" }),
      });
    }
  };

  const handleEdit = (plan: any) => {
    form.reset({
      name: plan.name,
      description: plan.description ?? "",
      price: String(plan.price),
      durationDays: String(plan.durationDays),
      maxVehicles: String(plan.maxVehicles),
      isActive: plan.isActive,
      vehicleTypes: plan.vehicleTypes ?? ["car"],
    });
    setEditPlan(plan);
  };

  const handleDelete = (id: number) => {
    deletePlan.mutate({ id }, {
      onSuccess: () => { toast({ title: "Plano removido" }); invalidate(); },
      onError: () => toast({ title: "Erro ao remover", variant: "destructive" }),
    });
  };

  const toggleVehicleType = (type: string) => {
    const current = form.watch("vehicleTypes") ?? [];
    if (current.includes(type)) {
      form.setValue("vehicleTypes", current.filter((t) => t !== type));
    } else {
      form.setValue("vehicleTypes", [...current, type]);
    }
  };

  const isEditing = !!editPlan;
  const dialogOpen = showAdd || isEditing;
  const closeDialog = () => { setShowAdd(false); setEditPlan(null); form.reset(); };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planos</h1>
          <p className="text-sm text-muted-foreground">Planos de assinatura disponíveis</p>
        </div>
        <Button onClick={() => { form.reset(); setShowAdd(true); }} data-testid="button-add-plan">
          <Plus className="w-4 h-4 mr-2" /> Novo Plano
        </Button>
      </div>

      {plans.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-52 rounded-lg" />)}
        </div>
      ) : !plans.data?.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ScrollText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum plano cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(plans.data ?? []).map((plan) => (
            <Card key={plan.id} data-testid={`plan-${plan.id}`} className={!plan.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    {plan.description && <CardDescription className="mt-0.5">{plan.description}</CardDescription>}
                  </div>
                  <Badge variant={plan.isActive ? "default" : "secondary"} className="shrink-0">{plan.isActive ? "Ativo" : "Inativo"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duração</span>
                    <span className="font-medium">{plan.durationDays} dias</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Veículos</span>
                    <span className="font-medium">{plan.maxVehicles} por titular</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aceita</span>
                    <span className="font-medium">{(plan.vehicleTypes ?? []).map((v) => VEHICLE_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v).join(", ")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{plan.subscriberCount} mensalistas ativos</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(plan)} data-testid={`button-edit-plan-${plan.id}`}>
                    <Edit className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(plan.id)} data-testid={`button-delete-plan-${plan.id}`}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isEditing ? "Editar Plano" : "Novo Plano"}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do plano *</Label>
              <Input {...form.register("name", { required: true })} placeholder="Ex: Plano Básico" data-testid="input-plan-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input {...form.register("description")} placeholder="Opcional" data-testid="input-plan-description" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Preço (R$) *</Label>
                <Input {...form.register("price", { required: true })} type="number" step="0.01" min="0" placeholder="0,00" data-testid="input-plan-price" />
              </div>
              <div className="space-y-1.5">
                <Label>Duração (dias)</Label>
                <Input {...form.register("durationDays")} type="number" min="1" data-testid="input-plan-duration" />
              </div>
              <div className="space-y-1.5">
                <Label>Max. veículos</Label>
                <Input {...form.register("maxVehicles")} type="number" min="1" data-testid="input-plan-vehicles" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipos de veículo aceitos</Label>
              <div className="flex gap-4 flex-wrap">
                {VEHICLE_TYPE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={(form.watch("vehicleTypes") ?? []).includes(opt.value)}
                      onCheckedChange={() => toggleVehicleType(opt.value)}
                      data-testid={`check-vehicle-${opt.value}`}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.watch("isActive")}
                onCheckedChange={(v) => form.setValue("isActive", v)}
                data-testid="switch-plan-active"
              />
              <Label>Plano ativo</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={createPlan.isPending || updatePlan.isPending} data-testid="button-submit-plan">
                {(createPlan.isPending || updatePlan.isPending) ? "Salvando..." : isEditing ? "Salvar" : "Criar Plano"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
