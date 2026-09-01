import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PLANO, type WorkoutBlock } from "@/lib/plan";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Square, ChevronLeft, Check } from "lucide-react";
import { fireConfetti } from "@/lib/confetti";
import { toast } from "sonner";
import { Paywall, useHasAccess } from "@/components/SubscriptionGate";


export const Route = createFileRoute("/_authenticated/workout/$id")({
  component: WorkoutPage,
});

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function beep(freq = 880, dur = 250) {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000);
    o.start(); o.stop(ctx.currentTime + dur / 1000 + 0.05);
  } catch {}
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

const labelBloco = (t: WorkoutBlock["tipo"]) =>
  t === "correr" ? "CORRER" : t === "caminhar" ? "CAMINHAR" : t === "aquecimento" ? "AQUECIMENTO" : "DESAQUECIMENTO";

function WorkoutPage() {
  const { id } = Route.useParams();
  const workout = PLANO.find((w) => w.id === id)!;
  const navigate = useNavigate();
  const { hasAccess, loading: loadingAccess } = useHasAccess();


  const [blocoIdx, setBlocoIdx] = useState(0);
  const [blocoLeft, setBlocoLeft] = useState(workout.blocos[0].duracao);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const totalSec = workout.blocos.reduce((a, b) => a + b.duracao, 0);
  const ranSec = workout.blocos.slice(0, blocoIdx).reduce((a, b) => a + b.duracao, 0) + (workout.blocos[blocoIdx].duracao - blocoLeft);

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setBlocoLeft((s) => s - 1);
    }, 1000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [running]);

  useEffect(() => {
    if (blocoLeft < 0) {
      // próximo bloco
      const next = blocoIdx + 1;
      if (next >= workout.blocos.length) {
        setRunning(false);
        setDone(true);
        beep(1320, 600); vibrate([200, 100, 200, 100, 400]);
        fireConfetti();
        setShowLog(true);
      } else {
        setBlocoIdx(next);
        setBlocoLeft(workout.blocos[next].duracao);
        beep(workout.blocos[next].tipo === "correr" ? 1320 : 660, 350);
        vibrate([120, 80, 120]);
      }
    }
  }, [blocoLeft, blocoIdx, workout.blocos]);

  const bloco = workout.blocos[blocoIdx];
  const corr = bloco.tipo === "correr" ? "var(--color-primary)" : bloco.tipo === "caminhar" ? "var(--color-secondary)" : "var(--color-accent)";
  const progressPct = ((bloco.duracao - blocoLeft) / bloco.duracao) * 100;

  function handleStop() {
    if (confirm("Parar o treino? O progresso não será salvo.")) {
      navigate({ to: "/workouts" });
    }
  }

  if (!loadingAccess && !hasAccess) {
    return (
      <div className="px-5 pt-8 pb-6 max-w-xl mx-auto">
        <Link to="/workouts" className="flex items-center gap-1 text-muted-foreground">
          <ChevronLeft className="size-5" /> Voltar
        </Link>
        <div className="mt-6">
          <Paywall
            titulo="Treino disponível no plano"
            descricao="Assine o FitPower para usar o timer guiado e registrar seus treinos."
          />
        </div>
      </div>
    );
  }

  return (

    <div className="min-h-screen flex flex-col">
      <header className="px-5 pt-6 flex items-center justify-between">
        <Link to="/workouts" className="flex items-center gap-1 text-muted-foreground"><ChevronLeft className="size-5" /> Voltar</Link>
        <span className="text-sm font-semibold text-muted-foreground">{fmt(ranSec)} / {fmt(totalSec)}</span>
      </header>

      <main className="flex-1 flex flex-col px-5 pt-4 pb-6 max-w-xl mx-auto w-full">
        <h1 className="text-2xl font-bold">{workout.titulo}</h1>
        <p className="text-muted-foreground">{workout.descricao}</p>

        <div className="flex-1 flex flex-col items-center justify-center mt-4">
          {/* Big circle timer */}
          <div className="relative size-72">
            <svg viewBox="0 0 100 100" className="-rotate-90 absolute inset-0">
              <circle cx="50" cy="50" r="46" fill="none" stroke="var(--color-muted)" strokeWidth="6" />
              <circle cx="50" cy="50" r="46" fill="none" stroke={corr} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 46}
                strokeDashoffset={2 * Math.PI * 46 * (1 - progressPct / 100)}
                style={{ transition: "stroke-dashoffset 1s linear" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-bold tracking-widest" style={{ color: corr }}>{labelBloco(bloco.tipo)}</span>
              <span className="text-6xl font-bold tabular-nums mt-1">{fmt(Math.max(0, blocoLeft))}</span>
              <span className="text-xs text-muted-foreground mt-1">Bloco {blocoIdx + 1}/{workout.blocos.length}</span>
            </div>
          </div>

          {/* Próximo bloco */}
          {blocoIdx + 1 < workout.blocos.length && (
            <p className="mt-6 text-sm text-muted-foreground">
              Próximo: <span className="font-semibold">{labelBloco(workout.blocos[blocoIdx + 1].tipo)}</span> · {fmt(workout.blocos[blocoIdx + 1].duracao)}
            </p>
          )}
        </div>

        {/* Controles */}
        <div className="flex gap-3 mt-6">
          {!done && (
            <>
              <button onClick={() => setRunning((r) => !r)} className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-bold py-4 text-lg shadow-glow active:scale-[0.98]">
                {running ? <><Pause className="size-5" /> Pausar</> : <><Play className="size-5 fill-current" /> {ranSec === 0 ? "Iniciar" : "Continuar"}</>}
              </button>
              <button onClick={handleStop} className="rounded-2xl border-2 px-5 font-semibold">
                <Square className="size-5" />
              </button>
            </>
          )}
          {done && (
            <button onClick={() => setShowLog(true)} className="flex-1 rounded-2xl bg-success text-success-foreground font-bold py-4 text-lg shadow-soft">
              <Check className="size-5 inline mr-2" /> Treino concluído!
            </button>
          )}
        </div>
      </main>

      {showLog && <LogModal workout={workout} onDone={() => navigate({ to: "/dashboard" })} />}
    </div>
  );
}

function LogModal({ workout, onDone }: { workout: typeof PLANO[number]; onDone: () => void }) {
  const [esforco, setEsforco] = useState(5);
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  async function salvar() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("workout_logs").insert({
      user_id: u.user.id,
      semana: workout.semana,
      numero_treino: workout.numero,
      duracao: workout.duracaoMin,
      esforco,
      observacao: obs || null,
      concluido: true,
    });
    if (error) toast.error(error.message);
    else toast.success("Treino salvo! 💪");
    setSaving(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-background w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-glow">
        <h3 className="text-2xl font-bold">🎉 Mandou bem!</h3>
        <p className="text-muted-foreground mt-1">Como foi o treino? Registre seu esforço.</p>

        <label className="block mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-sm">Esforço percebido</span>
            <span className="font-bold text-primary text-lg">{esforco}/10</span>
          </div>
          <input type="range" min={0} max={10} value={esforco} onChange={(e) => setEsforco(+e.target.value)} className="w-full accent-primary" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>Tranquilo</span><span>No limite</span></div>
        </label>

        <label className="block mt-4">
          <span className="font-semibold text-sm">Observação (opcional)</span>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} placeholder="Como você se sentiu?" className="mt-1.5 w-full p-3 rounded-xl border-2 bg-card outline-none focus:border-primary resize-none" />
        </label>

        <button onClick={salvar} disabled={saving} className="mt-6 w-full rounded-2xl bg-primary text-primary-foreground font-bold py-4 shadow-glow disabled:opacity-60">
          {saving ? "Salvando..." : "Salvar treino"}
        </button>
      </div>
    </div>
  );
}
