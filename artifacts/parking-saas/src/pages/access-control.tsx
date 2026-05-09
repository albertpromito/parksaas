import { useState, useEffect } from "react";
import { ShieldCheck, ShieldOff, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type Mode = "idle" | "set" | "change" | "remove";

export default function AccessControl() {
  const { toast } = useToast();
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/tenant/access-pin/status`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setHasPin(d.hasPin))
      .catch(() => setHasPin(false))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setMode("idle");
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4) {
      toast({ title: "A senha deve ter pelo menos 4 caracteres", variant: "destructive" });
      return;
    }
    if (newPin !== confirmPin) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, string> = { pin: newPin };
      if (hasPin && currentPin) body.currentPin = currentPin;

      const r = await fetch(`${BASE}/api/tenant/access-pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        toast({ title: data.error ?? "Erro ao salvar senha", variant: "destructive" });
        return;
      }
      setHasPin(true);
      resetForm();
      sessionStorage.removeItem("parkhub_pin_ok");
      toast({ title: hasPin ? "Senha alterada com sucesso" : "Senha de acesso definida", description: "As áreas protegidas exigirão a nova senha." });
    } catch {
      toast({ title: "Erro de conexão", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemovePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await fetch(`${BASE}/api/tenant/access-pin`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPin }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast({ title: data.error ?? "Erro ao remover senha", variant: "destructive" });
        return;
      }
      setHasPin(false);
      resetForm();
      sessionStorage.removeItem("parkhub_pin_ok");
      toast({ title: "Senha de acesso removida", description: "As áreas protegidas agora estão livres." });
    } catch {
      toast({ title: "Erro de conexão", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Controle de Acesso</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Defina uma senha para proteger o acesso ao Dashboard, Financeiro e Relatórios.
        </p>
      </div>

      {/* Status card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {hasPin ? (
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <ShieldOff className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <CardTitle className="text-base">
                  {hasPin ? "Proteção ativa" : "Sem proteção"}
                </CardTitle>
                <CardDescription>
                  {hasPin
                    ? "Dashboard, Financeiro e Relatórios exigem senha"
                    : "Qualquer usuário logado pode acessar todas as áreas"}
                </CardDescription>
              </div>
            </div>
            <Badge variant={hasPin ? "default" : "secondary"}>
              {hasPin ? "Protegido" : "Livre"}
            </Badge>
          </div>
        </CardHeader>

        {mode === "idle" && (
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {!hasPin && (
                <Button onClick={() => setMode("set")} size="sm">
                  <Lock className="w-4 h-4 mr-2" />
                  Definir senha de acesso
                </Button>
              )}
              {hasPin && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setMode("change")}>
                    Alterar senha
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => setMode("remove")}>
                    Remover proteção
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Set PIN form */}
      {mode === "set" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Definir senha de acesso</CardTitle>
            <CardDescription>A senha deve ter pelo menos 4 caracteres.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetPin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-pin">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="new-pin"
                    type={showNew ? "text" : "password"}
                    placeholder="Mínimo 4 caracteres"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="pr-10"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-pin">Confirmar senha</Label>
                <div className="relative">
                  <Input
                    id="confirm-pin"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repita a senha"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPin && newPin !== confirmPin && (
                  <p className="text-xs text-destructive">As senhas não coincidem</p>
                )}
                {confirmPin && newPin === confirmPin && newPin.length >= 4 && (
                  <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Senhas coincidem</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={submitting || !newPin || !confirmPin}>
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Salvar senha
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Change PIN form */}
      {mode === "change" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alterar senha de acesso</CardTitle>
            <CardDescription>Informe a senha atual e depois a nova senha.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetPin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-pin">Senha atual</Label>
                <div className="relative">
                  <Input
                    id="current-pin"
                    type={showCurrent ? "text" : "password"}
                    placeholder="Senha atual"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    className="pr-10"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-pin-change">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="new-pin-change"
                    type={showNew ? "text" : "password"}
                    placeholder="Mínimo 4 caracteres"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-pin-change">Confirmar nova senha</Label>
                <div className="relative">
                  <Input
                    id="confirm-pin-change"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repita a nova senha"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPin && newPin !== confirmPin && (
                  <p className="text-xs text-destructive">As senhas não coincidem</p>
                )}
                {confirmPin && newPin === confirmPin && newPin.length >= 4 && (
                  <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Senhas coincidem</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={submitting || !currentPin || !newPin || !confirmPin}>
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Alterar senha
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Remove PIN form */}
      {mode === "remove" && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Remover proteção</CardTitle>
            <CardDescription>
              Confirme a senha atual para remover a proteção das áreas restritas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRemovePin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="remove-pin">Senha atual</Label>
                <div className="relative">
                  <Input
                    id="remove-pin"
                    type={showCurrent ? "text" : "password"}
                    placeholder="Confirme sua senha atual"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    className="pr-10"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="destructive" disabled={submitting || !currentPin}>
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Remover proteção
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Info box */}
      <Card className="bg-muted/40 border-dashed">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Áreas protegidas:</span>{" "}
            Dashboard, Financeiro e Relatórios. A senha é exigida sempre que você entrar em uma dessas áreas — ao sair e retornar, será solicitada novamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
