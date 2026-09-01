import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada!");
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-10">
      <Logo />
      <form onSubmit={onSubmit} className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <h1 className="text-3xl font-bold">Nova senha</h1>
        <p className="text-muted-foreground mt-2">Defina sua nova senha para entrar.</p>
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
          className="mt-6 w-full px-4 py-3.5 rounded-xl border-2 bg-card text-base outline-none focus:border-primary"
          placeholder="Nova senha" />
        <button disabled={loading} className="mt-4 w-full rounded-2xl bg-primary text-primary-foreground font-bold py-4 shadow-glow disabled:opacity-60">
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </div>
  );
}
