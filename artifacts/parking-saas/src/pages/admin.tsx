import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import {
  ParkingSquare, Plus, Edit, Trash2, LogOut, Users, ShieldCheck,
  ShieldX, Building2, Phone, AtSign, Calendar, Search, AlertCircle,
  CheckCircle2, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Tenant {
  id: number;
  name: string;
  username: string;
  email: string;
  parkingName: string;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TenantForm {
  name: string;
  username: string;
  password: string;
  parkingName: string;
  phone: string;
  notes: string;
}

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts?.headers },
    ...opts,
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error ?? "Erro na requisição");
  }
  return r.status === 204 ? null : r.json();
}

function useTenants() {
  return useQuery<Tenant[]>({
    queryKey: ["admin-tenants"],
    queryFn: () => apiFetch("/admin/tenants"),
  });
}

function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => apiFetch("/admin/tenants", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tenants"] }),
  });
}

function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      apiFetch(`/admin/tenants/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tenants"] }),
  });
}

function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/admin/tenants/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tenants"] }),
  });
}

export default function AdminPanel() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Tenant | null>(null);

  const tenants = useTenants();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();

  const form = useForm<TenantForm>({
    defaultValues: { name: "", username: "", password: "", parkingName: "", phone: "", notes: "" },
  });

  const filtered = (tenants.data ?? []).filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.username.toLowerCase().includes(q) ||
      t.parkingName.toLowerCase().includes(q) ||
      (t.phone ?? "").includes(q)
    );
  });

  const activeCount = tenants.data?.filter((t) => t.isActive).length ?? 0;
  const inactiveCount = (tenants.data?.length ?? 0) - activeCount;

  function openCreate() {
    form.reset({ name: "", username: "", password: "", parkingName: "", phone: "", notes: "" });
    setEditTenant(null);
    setShowForm(true);
  }

  function openEdit(t: Tenant) {
    form.reset({ name: t.name, username: t.username, password: "", parkingName: t.parkingName, phone: t.phone ?? "", notes: t.notes ?? "" });
    setEditTenant(t);
    setShowForm(true);
  }

  function toggleAccess(t: Tenant) {
    updateTenant.mutate({ id: t.id, data: { isActive: !t.isActive } }, {
      onSuccess: () => toast({ title: t.isActive ? `Acesso de "${t.parkingName}" suspenso` : `Acesso de "${t.parkingName}" liberado` }),
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  }

  const onSubmit = form.handleSubmit((data) => {
    const payload: Record<string, string> = {
      name: data.name,
      username: data.username,
      parkingName: data.parkingName,
    };
    if (data.phone) payload.phone = data.phone;
    if (data.notes) payload.notes = data.notes;
    if (data.password) payload.password = data.password;

    if (editTenant) {
      updateTenant.mutate({ id: editTenant.id, data: payload }, {
        onSuccess: () => { toast({ title: "Cadastro atualizado" }); setShowForm(false); },
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      });
    } else {
      if (!data.password) { form.setError("password", { message: "Senha é obrigatória" }); return; }
      createTenant.mutate(payload, {
        onSuccess: () => { toast({ title: "Estacionamento cadastrado" }); setShowForm(false); },
        onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
      });
    }
  });

  function confirmDelete() {
    if (!deleteConfirm) return;
    deleteTenant.mutate(deleteConfirm.id, {
      onSuccess: () => { toast({ title: "Cadastro removido" }); setDeleteConfirm(null); },
      onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ParkingSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">ParkHub</span>
              <Badge className="text-xs bg-primary/10 text-primary border-0 hover:bg-primary/20">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Admin Master
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="gap-2 text-muted-foreground">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">Gerencie os estacionamentos cadastrados na plataforma</p>
          </div>
          <Button onClick={openCreate} data-testid="button-add-tenant">
            <Plus className="w-4 h-4 mr-2" /> Novo Estacionamento
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tenants.data?.length ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Total cadastrados</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Com acesso ativo</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ShieldX className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inactiveCount}</p>
                <p className="text-xs text-muted-foreground">Suspensos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, usuário ou estacionamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        {/* Tenant list */}
        {tenants.isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? "Nenhum resultado encontrado" : "Nenhum estacionamento cadastrado"}
              </p>
              {!search && (
                <Button className="mt-4" onClick={openCreate}>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar primeiro
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <Card
                key={t.id}
                className={`transition-all border-l-4 ${t.isActive ? "border-l-green-500" : "border-l-red-400 opacity-75"}`}
                data-testid={`tenant-${t.id}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                      <Building2 className={`w-5 h-5 ${t.isActive ? "text-green-600" : "text-red-500"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{t.parkingName}</h3>
                        {t.isActive ? (
                          <Badge className="text-xs bg-green-100 text-green-700 border-0 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            <ShieldX className="w-3 h-3 mr-1" />
                            Suspenso
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {t.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <AtSign className="w-3 h-3" />
                          {t.username}
                        </span>
                        {t.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {t.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Cadastrado em {format(new Date(t.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>

                      {t.notes && (
                        <p className="mt-1.5 text-xs text-muted-foreground italic flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                          {t.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-center gap-1">
                        <Switch
                          checked={t.isActive}
                          onCheckedChange={() => toggleAccess(t)}
                          aria-label="Ativar/Suspender acesso"
                          data-testid={`switch-access-${t.id}`}
                        />
                        <span className="text-xs text-muted-foreground">{t.isActive ? "Ativo" : "Suspenso"}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)} data-testid={`button-edit-${t.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(t)}
                        data-testid={`button-delete-${t.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTenant ? "Editar Cadastro" : "Novo Estacionamento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Nome do Estacionamento *</Label>
                <Input {...form.register("parkingName", { required: true })} placeholder="Ex: Estacionamento Central" data-testid="input-parking-name" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Nome do Responsável *</Label>
                <Input {...form.register("name", { required: true })} placeholder="Nome completo" data-testid="input-name" />
              </div>
              <div className="space-y-1.5">
                <Label>Usuário de acesso *</Label>
                <Input
                  {...form.register("username", { required: true })}
                  type="text"
                  placeholder="ex: estac.central"
                  autoCapitalize="none"
                  autoCorrect="off"
                  data-testid="input-tenant-username"
                />
                <p className="text-[10px] text-muted-foreground">Apenas letras minúsculas, números, . _ ou -</p>
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input {...form.register("phone")} type="tel" placeholder="(11) 99999-9999" data-testid="input-phone" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>{editTenant ? "Nova senha (deixe em branco para manter)" : "Senha de acesso *"}</Label>
                <Input
                  {...form.register("password", { required: !editTenant })}
                  type="password"
                  placeholder={editTenant ? "••••••• (inalterada)" : "Mínimo 6 caracteres"}
                  data-testid="input-tenant-password"
                />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Observações internas</Label>
                <Input {...form.register("notes")} placeholder="Ex: Paga mensalidade todo dia 5" data-testid="input-notes" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={createTenant.isPending || updateTenant.isPending} data-testid="button-submit-tenant">
                {(createTenant.isPending || updateTenant.isPending) ? "Salvando..." : editTenant ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover cadastro</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover <strong>"{deleteConfirm?.parkingName}"</strong>?
            <br />
            Esta ação não pode ser desfeita e o usuário perderá todo acesso imediatamente.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteTenant.isPending} data-testid="button-confirm-delete-tenant">
              {deleteTenant.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
