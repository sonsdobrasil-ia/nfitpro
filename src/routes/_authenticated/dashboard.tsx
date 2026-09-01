import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { PLANO, FRASES, workoutKey } from "@/lib/plan";
import { Play, BookOpen, Flame, Sparkles } from "lucide-react";
import { useHasAccess } from "@/components/SubscriptionGate";


export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { hasAccess, loading: loadingAccess } = useHasAccess();
  const [nome, setNome] = useState("atleta");

  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const [onboardingDone, setOnboardingDone] = useState(true);
  const [frase] = useState(() => FRASES[Math.floor(Math.random() * FRASES.length)]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: prof }, { data: logs }] = await Promise.all([
        supabase.from("profiles").select("nome,onboarding_done").eq("user_id", u.user.id).maybeSingle(),
        supabase.from("workout_logs").select("semana,numero_treino").eq("user_id", u.user.id).eq("concluido", true),
      ]);
      if (prof?.nome) setNome(prof.nome);
      setOnboardingDone(prof?.onboarding_done ?? false);
      setCompletedKeys(new Set((logs ?? []).map((l) => `${l.semana}-${l.numero_treino}`)));
    })();
  }, []);

  const proximo = PLANO.find((w) => !completedKeys.has(workoutKey(w.semana, w.numero)));
  const totalTreinos = PLANO.length;
  const concluidos = completedKeys.size;
  const semanaAtual = proximo?.semana ?? 4;

  return (
    <div className="px-5 pt-6 max-w-xl mx-auto">
      <header className="flex items-center justify-between">
        <Logo />
      </header>

      <div className="mt-6">
        <p className="text-muted-foreground">Olá,</p>
        <h1 className="text-3xl font-bold">{nome}! 👋</h1>
      </div>

      {!hasAccess && !loadingAccess && (
        <Link to="/planos" className="mt-5 block rounded-2xl bg-gradient-primary text-primary-foreground p-4 font-semibold shadow-glow">
          🔓 Assine e libere todos os eBooks e treinos · R$ 9,90/mês →
        </Link>
      )}

      {!onboardingDone && (
        <Link to="/onboarding" className="mt-5 block rounded-2xl bg-accent text-accent-foreground p-4 font-semibold shadow-soft">
          ✨ Conheça o método FitPower (1 min) →
        </Link>
      )}


      {/* Progresso geral */}
      <div className="mt-6 rounded-2xl bg-card border p-5 shadow-soft">
        <div className="flex justify-between items-center text-sm">
          <span className="font-semibold">Plano FitPower</span>
          <span className="text-muted-foreground">Semana {semanaAtual} de 4</span>
        </div>
        <div className="mt-3 h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-energy transition-all" style={{ width: `${(concluidos / totalTreinos) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{concluidos} de {totalTreinos} treinos concluídos</p>
      </div>

      {/* Próximo treino */}
      {proximo ? (
        <div className="mt-5 rounded-2xl bg-gradient-primary text-primary-foreground p-6 shadow-glow">
          <span className="text-xs uppercase tracking-wider opacity-90 font-semibold">Próximo treino</span>
          <h2 className="text-2xl font-bold mt-1">{proximo.titulo}</h2>
          <p className="opacity-95 mt-1">{proximo.descricao}</p>
          <Link to="/workout/$id" params={{ id: proximo.id }} className="mt-5 inline-flex items-center gap-2 bg-white text-primary rounded-xl px-5 py-3 font-bold active:scale-[0.97]">
            <Play className="size-4 fill-current" /> Treinar agora
          </Link>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-success text-success-foreground p-6 text-center">
          <Sparkles className="mx-auto size-7" />
          <h2 className="text-xl font-bold mt-2">Você completou o plano!</h2>
          <p className="opacity-95 mt-1">Veja seu certificado em Progresso.</p>
        </div>
      )}

      {/* Frase motivacional */}
      <div className="mt-5 rounded-2xl border-2 border-dashed border-primary/30 p-4 flex gap-3 items-start">
        <Flame className="size-5 text-primary shrink-0 mt-0.5" />
        <p className="italic text-sm">"{frase}"</p>
      </div>

      {/* eBook shortcut */}
      <Link to="/ebook" className="mt-5 mb-8 flex items-center gap-3 rounded-2xl bg-card border p-4 shadow-soft">
        <div className="size-11 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
          <BookOpen className="size-5" />
        </div>
        <div className="flex-1">
          <p className="font-bold">Biblioteca de eBooks</p>
          <p className="text-xs text-muted-foreground">Leia e acompanhe seu progresso</p>
        </div>
        <span className="text-muted-foreground">›</span>
      </Link>
    </div>
  );
}
