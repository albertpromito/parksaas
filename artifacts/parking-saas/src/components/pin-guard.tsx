import { useState, useEffect, useRef } from "react";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export function clearPinSession() {
  // no-op: unlock state is now purely in-memory and resets on navigation
}

interface PinGuardProps {
  children: React.ReactNode;
}

export function PinGuard({ children }: PinGuardProps) {
  const [status, setStatus] = useState<"loading" | "unlocked" | "locked">("loading");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${BASE}/api/tenant/access-pin/status`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setStatus(data.hasPin ? "locked" : "unlocked"))
      .catch(() => setStatus("unlocked"));
  }, []);

  useEffect(() => {
    if (status === "locked") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [status]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    setSubmitting(true);
    setError("");
    try {
      const r = await fetch(`${BASE}/api/tenant/verify-access-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pin }),
      });
      const data = await r.json();
      if (data.valid) {
        setStatus("unlocked");
      } else {
        setError("Senha incorreta. Tente novamente.");
        setPin("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "unlocked") {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center h-full min-h-[500px] px-4">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-xl shadow-sm p-8 text-center space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Área Protegida</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Digite a senha de acesso para continuar
              </p>
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="relative">
              <Input
                ref={inputRef}
                type={showPin ? "text" : "password"}
                placeholder="Senha de acesso"
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError(""); }}
                className={error ? "border-destructive pr-10" : "pr-10"}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <p className="text-sm text-destructive text-left">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={!pin || submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Desbloquear
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
