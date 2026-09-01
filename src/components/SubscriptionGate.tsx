import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { useSubscription } from "@/lib/use-subscription";
import { useIsAdmin } from "@/lib/use-admin";
import { BENEFICIOS } from "@/lib/plans";

export function useHasAccess() {
  const { active, loading } = useSubscription();
  const { isAdmin, loading: loadingAdmin } = useIsAdmin();
  return { hasAccess: active || isAdmin, loading: loading || loadingAdmin };
}

export function Paywall({
  titulo = "Conteúdo do plano FitPower",
  descricao = "Assine para liberar a biblioteca completa, os treinos e o seu certificado de 5km.",
  compact = false,
}: {
  titulo?: string;
  descricao?: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-card p-6 text-center shadow-soft">
      <div className="size-12 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto">
        <Lock className="size-6" />
      </div>
      <h2 className="mt-3 text-lg font-bold">{titulo}</h2>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">{descricao}</p>

      {!compact && (
        <ul className="mt-4 space-y-1.5 text-left max-w-sm mx-auto">
          {BENEFICIOS.slice(0, 4).map((b) => (
            <li key={b} className="flex gap-2 text-sm">
              <Sparkles className="size-4 text-secondary mt-0.5 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/planos"
        className="mt-5 inline-flex items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold px-6 py-3 shadow-glow active:scale-[0.98] transition"
      >
        Ver planos · a partir de R$ 9,90
      </Link>
    </div>
  );
}

/** Envolve conteúdo que exige assinatura ativa. */
export function SubscriptionGate({
  children,
  titulo,
  descricao,
}: {
  children: React.ReactNode;
  titulo?: string;
  descricao?: string;
}) {
  const { hasAccess, loading } = useHasAccess();
  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }
  if (!hasAccess) {
    return <Paywall titulo={titulo} descricao={descricao} />;
  }
  return <>{children}</>;
}
