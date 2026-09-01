import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

const search = z.object({ mode: z.enum(["login", "signup", "forgot"]).optional() });

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: search,
  component: AuthPage,
});

function AuthPage() {
  const { mode = "login" } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { nome },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Bem-vindo à FitPower 🎉");
        navigate({ to: "/dashboard" });
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("Enviamos um link para o seu e-mail.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-10">
      <Link to="/" className="self-start"><Logo /></Link>
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <h1 className="text-3xl font-bold">
          {mode === "signup" ? "Criar conta" : mode === "forgot" ? "Recuperar senha" : "Entrar"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {mode === "signup" ? "Comece sua jornada até os 5km hoje." : mode === "forgot" ? "Enviaremos um link de redefinição." : "Bem-vindo de volta, atleta!"}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <Field label="Nome">
              <input required value={nome} onChange={(e) => setNome(e.target.value)} className="input" placeholder="Seu nome" />
            </Field>
          )}
          <Field label="E-mail">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="voce@email.com" />
          </Field>
          {mode !== "forgot" && (
            <Field label="Senha">
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="Mínimo 6 caracteres" />
            </Field>
          )}

          <button disabled={loading} className="w-full rounded-2xl bg-primary text-primary-foreground font-bold py-4 shadow-glow active:scale-[0.98] disabled:opacity-60">
            {loading ? "Aguarde..." : mode === "signup" ? "Criar conta" : mode === "forgot" ? "Enviar link" : "Entrar"}
          </button>
        </form>

        <div className="mt-6 text-sm text-center text-muted-foreground space-y-2">
          {mode === "login" && (<>
            <Link to="/auth" search={{ mode: "forgot" }} className="block underline">Esqueci minha senha</Link>
            <Link to="/auth" search={{ mode: "signup" }} className="block">Não tem conta? <span className="text-primary font-semibold">Cadastre-se</span></Link>
          </>)}
          {mode === "signup" && (
            <Link to="/auth" search={{ mode: "login" }}>Já tem conta? <span className="text-primary font-semibold">Entrar</span></Link>
          )}
          {mode === "forgot" && (
            <Link to="/auth" search={{ mode: "login" }} className="text-primary font-semibold">Voltar ao login</Link>
          )}
        </div>
      </div>

      <style>{`.input{width:100%;padding:14px 16px;border-radius:14px;border:2px solid var(--color-border);background:var(--color-card);font-size:16px;outline:none;transition:border-color .15s}.input:focus{border-color:var(--color-primary)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
