import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PLANO, workoutKey } from "@/lib/plan";
import { Lock, Check, Play } from "lucide-react";
import { Paywall, useHasAccess } from "@/components/SubscriptionGate";

export const Route = createFileRoute("/_authenticated/workouts")({
  component: Workouts,
});

function Workouts() {
  const { hasAccess, loading: loadingAccess } = useHasAccess();
  const [completed, setCompleted] = useState<Set<string>>(new Set());


  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("workout_logs").select("semana,numero_treino").eq("user_id", u.user.id).eq("concluido", true);
      setCompleted(new Set((data ?? []).map((l) => `${l.semana}-${l.numero_treino}`)));
    })();
  }, []);

  // Agrupar por semana
  const semanas = [1, 2, 3, 4].map((s) => PLANO.filter((w) => w.semana === s));

  if (!loadingAccess && !hasAccess) {
    return (
      <div className="px-5 pt-8 pb-4 max-w-xl mx-auto">
        <h1 className="text-3xl font-bold">Treinos</h1>
        <p className="text-muted-foreground mt-1 mb-6">Plano FitPower · 4 semanas, 12 treinos.</p>
        <Paywall
          titulo="Treinos liberados no plano"
          descricao="Assine o FitPower para acessar os 12 treinos, o timer guiado e o registro de esforço."
        />
      </div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-4 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold">Treinos</h1>
      <p className="text-muted-foreground mt-1">Plano FitPower · 4 semanas, 12 treinos.</p>

      {semanas.map((treinos, idx) => {

        const semana = idx + 1;
        return (
          <section key={semana} className="mt-7">
            <h2 className="font-bold text-lg flex items-center gap-2">
              Semana {semana}
              <span className="text-xs font-normal text-muted-foreground">· {treinos[0].descricao.split("—")[0]}</span>
            </h2>
            <ul className="mt-3 space-y-3">
              {treinos.map((w) => {
                const key = workoutKey(w.semana, w.numero);
                const isDone = completed.has(key);
                // Disponível: primeiro não concluído ou os já feitos da mesma semana
                const indexInPlan = PLANO.indexOf(w);
                const prevDone = indexInPlan === 0 || completed.has(workoutKey(PLANO[indexInPlan - 1].semana, PLANO[indexInPlan - 1].numero));
                const status = isDone ? "done" : prevDone ? "open" : "locked";
                return (
                  <li key={w.id}>
                    <Link
                      to="/workout/$id"
                      params={{ id: w.id }}
                      className={`flex items-center gap-4 rounded-2xl p-4 border shadow-soft transition ${
                        status === "locked" ? "bg-muted opacity-60 pointer-events-none" :
                        status === "done" ? "bg-success/10 border-success/30" : "bg-card active:scale-[0.99]"
                      }`}
                    >
                      <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${
                        status === "done" ? "bg-success text-success-foreground" :
                        status === "open" ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"
                      }`}>
                        {status === "done" ? <Check className="size-5" /> :
                          status === "locked" ? <Lock className="size-4" /> : <Play className="size-4 fill-current" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{w.titulo}</p>
                        <p className="text-xs text-muted-foreground truncate">{w.descricao}</p>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">{w.duracaoMin}min</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
