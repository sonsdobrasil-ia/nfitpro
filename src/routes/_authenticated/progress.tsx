import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PLANO } from "@/lib/plan";
import jsPDF from "jspdf";
import { Award, Flame, Clock, Trophy, Download } from "lucide-react";
import { Paywall, useHasAccess } from "@/components/SubscriptionGate";


type Log = { id: string; semana: number; numero_treino: number; duracao: number; esforco: number | null; data: string; observacao: string | null };

export const Route = createFileRoute("/_authenticated/progress")({
  component: ProgressPage,
});

function ProgressPage() {
  const { hasAccess, loading: loadingAccess } = useHasAccess();
  const [logs, setLogs] = useState<Log[]>([]);

  const [nome, setNome] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: ls }, { data: prof }] = await Promise.all([
        supabase.from("workout_logs").select("*").eq("user_id", u.user.id).order("data", { ascending: false }),
        supabase.from("profiles").select("nome").eq("user_id", u.user.id).maybeSingle(),
      ]);
      setLogs((ls ?? []) as Log[]);
      if (prof?.nome) setNome(prof.nome);
    })();
  }, []);

  const stats = useMemo(() => {
    const totalMin = logs.reduce((a, l) => a + l.duracao, 0);
    const esforcoMed = logs.length ? logs.reduce((a, l) => a + (l.esforco ?? 0), 0) / logs.length : 0;
    // Streak: dias consecutivos com pelo menos 1 treino
    const dates = [...new Set(logs.map((l) => new Date(l.data).toDateString()))].map((d) => new Date(d));
    dates.sort((a, b) => b.getTime() - a.getTime());
    let streak = 0;
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = 0; i < dates.length; i++) {
      const d = new Date(dates[i]); d.setHours(0,0,0,0);
      const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
      if (diff === streak || (i === 0 && diff <= 1)) streak++;
      else break;
    }
    const porSemana = [1,2,3,4].map((s) => logs.filter((l) => l.semana === s).length);
    return { totalMin, esforcoMed, streak, porSemana, total: logs.length };
  }, [logs]);

  const planoCompleto = stats.total >= PLANO.length;

  function exportarCertificado() {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFillColor(255, 107, 53);
    doc.rect(0, 0, 297, 25, "F");
    doc.setTextColor(255,255,255);
    doc.setFontSize(22);
    doc.text("FitPower", 20, 17);
    doc.setTextColor(43,43,43);
    doc.setFontSize(34);
    doc.text("Certificado de Conclusão", 148.5, 70, { align: "center" });
    doc.setFontSize(14);
    doc.text("Concedido a", 148.5, 95, { align: "center" });
    doc.setFontSize(28);
    doc.setTextColor(255,107,53);
    doc.text(nome || "Atleta FitPower", 148.5, 115, { align: "center" });
    doc.setTextColor(43,43,43);
    doc.setFontSize(14);
    doc.text("por completar o Protocolo FitPower de 30 dias", 148.5, 135, { align: "center" });
    doc.text("e cruzar a linha dos 5km. 🏁", 148.5, 145, { align: "center" });
    doc.setFontSize(11);
    doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, 148.5, 175, { align: "center" });
    doc.save("certificado-fitpower.pdf");
  }

  if (!loadingAccess && !hasAccess) {
    return (
      <div className="px-5 pt-8 pb-4 max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Progresso</h1>
        <Paywall
          titulo="Progresso e certificado no plano"
          descricao="Assine o FitPower para acompanhar histórico, gráficos, sequência e emitir seu certificado de 5km."
        />
      </div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-4 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold">Progresso</h1>


      {/* Cards */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        <Card icon={Trophy} label="Treinos" value={stats.total} color="text-primary" />
        <Card icon={Clock} label="Minutos" value={stats.totalMin} color="text-secondary" />
        <Card icon={Flame} label="Streak" value={stats.streak} color="text-accent-foreground" />
      </div>

      {/* Gráfico simples por semana */}
      <div className="mt-5 rounded-2xl bg-card border p-5 shadow-soft">
        <h3 className="font-bold">Treinos por semana</h3>
        <div className="mt-4 flex items-end justify-around gap-3 h-32">
          {stats.porSemana.map((q, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full bg-gradient-energy rounded-t-lg transition-all min-h-[4px]" style={{ height: `${(q / 3) * 100}%` }} />
              <span className="text-xs text-muted-foreground">S{i+1}</span>
              <span className="text-sm font-bold">{q}/3</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Esforço médio: <span className="font-bold text-foreground">{stats.esforcoMed.toFixed(1)}</span>/10</p>
      </div>

      {/* Certificado */}
      {planoCompleto && (
        <div className="mt-5 rounded-2xl bg-gradient-energy p-5 text-foreground shadow-glow">
          <Award className="size-7" />
          <h3 className="text-xl font-bold mt-2">Você concluiu seus 5km! 🏁</h3>
          <p className="text-sm mt-1">Baixe seu certificado digital.</p>
          <button onClick={exportarCertificado} className="mt-4 inline-flex items-center gap-2 bg-foreground text-background rounded-xl px-4 py-2.5 font-bold">
            <Download className="size-4" /> Baixar certificado
          </button>
        </div>
      )}

      {/* Histórico */}
      <h3 className="font-bold text-lg mt-7">Histórico</h3>
      {logs.length === 0 ? (
        <p className="mt-3 text-muted-foreground text-sm">Nenhum treino registrado ainda. Bora começar!</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {logs.map((l) => (
            <li key={l.id} className="rounded-xl bg-card border p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">Semana {l.semana} · Treino {l.numero_treino}</p>
                <p className="text-xs text-muted-foreground">{new Date(l.data).toLocaleDateString("pt-BR")} · {l.duracao}min</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">Esforço {l.esforco ?? "-"}/10</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Card({ icon: Icon, label, value, color }: { icon: React.ComponentType<{className?:string}>; label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl bg-card border p-4 shadow-soft text-center">
      <Icon className={`size-5 mx-auto ${color}`} />
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
