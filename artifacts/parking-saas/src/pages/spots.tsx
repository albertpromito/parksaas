import { useState } from "react";
import { useListSpots, useCreateSpot, useUpdateSpot, useDeleteSpot, getListSpotsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { ParkingSquare, Plus, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  available: { label: "Disponível", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", dot: "bg-green-500" },
  occupied: { label: "Ocupada", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", dot: "bg-red-500" },
  reserved: { label: "Reservada", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", dot: "bg-yellow-500" },
  maintenance: { label: "Manutenção", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400", dot: "bg-gray-400" },
};

const TYPE_LABELS: Record<string, string> = {
  standard: "Padrão", handicapped: "PCD", vip: "VIP", motorcycle: "Moto", large: "Grande",
};

interface SpotFormValues { number: string; type: string; floor: string; section: string; notes: string; status: string; }

export default function Spots() {
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editSpot, setEditSpot] = useState<{ id: number; status: string } | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const params = { ...(filterStatus ? { status: filterStatus as any } : {}), ...(filterType ? { type: filterType as any } : {}) };
  const spots = useListSpots(params);
  const createSpot = useCreateSpot();
  const updateSpot = useUpdateSpot();

  const form = useForm<SpotFormValues>({ defaultValues: { number: "", type: "standard", floor: "1", section: "A", notes: "", status: "available" } });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListSpotsQueryKey() });

  const onSubmit = (data: SpotFormValues) => {
    createSpot.mutate({ data: { number: data.number, type: data.type as any, floor: data.floor, section: data.section, notes: data.notes || undefined } }, {
      onSuccess: () => { toast({ title: "Vaga criada" }); setShowAddDialog(false); form.reset(); invalidate(); },
      onError: () => toast({ title: "Erro ao criar vaga", variant: "destructive" }),
    });
  };

  const changeStatus = (id: number, status: string) => {
    updateSpot.mutate({ id, data: { status: status as any } }, {
      onSuccess: () => { toast({ title: "Status atualizado" }); setEditSpot(null); invalidate(); },
      onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
    });
  };

  const statusCounts = {
    available: spots.data?.filter((s) => s.status === "available").length ?? 0,
    occupied: spots.data?.filter((s) => s.status === "occupied").length ?? 0,
    reserved: spots.data?.filter((s) => s.status === "reserved").length ?? 0,
    maintenance: spots.data?.filter((s) => s.status === "maintenance").length ?? 0,
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vagas</h1>
          <p className="text-sm text-muted-foreground">Controle e status de todas as vagas</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-spot">
          <Plus className="w-4 h-4 mr-2" /> Nova Vaga
        </Button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <Card key={key} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilterStatus(filterStatus === key ? "" : key)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className="text-xs font-medium text-muted-foreground">{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{statusCounts[key as keyof typeof statusCounts]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40" data-testid="select-filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="available">Disponível</SelectItem>
            <SelectItem value="occupied">Ocupada</SelectItem>
            <SelectItem value="reserved">Reservada</SelectItem>
            <SelectItem value="maintenance">Manutenção</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType || "all"} onValueChange={(v) => setFilterType(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40" data-testid="select-filter-type">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="standard">Padrão</SelectItem>
            <SelectItem value="handicapped">PCD</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="motorcycle">Moto</SelectItem>
            <SelectItem value="large">Grande</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Spots grid */}
      {spots.isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {[...Array(18)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {(spots.data ?? []).map((spot) => {
            const cfg = STATUS_CONFIG[spot.status] ?? STATUS_CONFIG.available;
            return (
              <button
                key={spot.id}
                data-testid={`spot-${spot.id}`}
                onClick={() => setEditSpot({ id: spot.id, status: spot.status })}
                className={`relative p-3 rounded-lg border text-left transition-all hover:shadow-md ${spot.status === "available" ? "border-green-200 dark:border-green-800 hover:border-green-400" : spot.status === "occupied" ? "border-red-200 dark:border-red-800 hover:border-red-400" : spot.status === "reserved" ? "border-yellow-200 dark:border-yellow-800 hover:border-yellow-400" : "border-gray-200 dark:border-gray-700"} bg-card`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold">{spot.number}</span>
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                </div>
                <ParkingSquare className={`w-5 h-5 mb-1 ${spot.status === "available" ? "text-green-500" : spot.status === "occupied" ? "text-red-500" : spot.status === "reserved" ? "text-yellow-500" : "text-gray-400"}`} />
                <p className="text-xs text-muted-foreground">{TYPE_LABELS[spot.type]}</p>
                <p className="text-xs text-muted-foreground">Piso {spot.floor}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Edit status dialog */}
      <Dialog open={!!editSpot} onOpenChange={() => setEditSpot(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alterar Status da Vaga</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                data-testid={`status-option-${key}`}
                onClick={() => editSpot && changeStatus(editSpot.id, key)}
                className={`p-3 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all hover:border-primary ${editSpot?.status === key ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add spot dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Vaga</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Número</Label>
                <Input {...form.register("number", { required: true })} placeholder="Ex: A01" data-testid="input-spot-number" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.watch("type")} onValueChange={(v) => form.setValue("type", v)}>
                  <SelectTrigger data-testid="select-spot-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Padrão</SelectItem>
                    <SelectItem value="handicapped">PCD</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="motorcycle">Moto</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Piso</Label>
                <Input {...form.register("floor")} placeholder="Ex: 1" data-testid="input-spot-floor" />
              </div>
              <div className="space-y-1.5">
                <Label>Seção</Label>
                <Input {...form.register("section")} placeholder="Ex: A" data-testid="input-spot-section" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Input {...form.register("notes")} placeholder="Opcional" data-testid="input-spot-notes" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={createSpot.isPending} data-testid="button-submit-spot">
                {createSpot.isPending ? "Salvando..." : "Criar Vaga"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
