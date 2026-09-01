import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import { Bell, Download, LogOut, Moon, Sun, User as UserIcon, Save, Crown, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useSubscription } from "@/lib/use-subscription";

import { toast } from "sonner";
import { setTheme, getTheme } from "@/lib/theme";

const DIAS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const sub = useSubscription();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [peso, setPeso] = useState<string>("");
  const [altura, setAltura] = useState<string>("");
  const [historicoPeso, setHistoricoPeso] = useState<any[]>([]);
  const [meta, setMeta] = useState("");
  const [dias, setDias] = useState<string[]>([]);
  const [horario, setHorario] = useState("18:00");
  const [tema, setTemaState] = useState<"light" | "dark">("light");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTemaState(getTheme());
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const { data } = await supabase.from("profiles").select("*").eq("user_id", u.user.id).maybeSingle();
      if (data) {
        setNome(data.nome ?? "");
        setPeso(data.peso != null ? String(data.peso) : "");
        setAltura(data.altura != null ? String(data.altura) : "");
        setMeta(data.meta ?? "");
        setDias(data.dias_lembrete ?? []);
        setHorario(data.horario_lembrete ?? "18:00");
      }
      const { data: hist } = await supabase.from("weight_history").select("*").eq("user_id", u.user.id).order("data", { ascending: true });
      if (hist) setHistoricoPeso(hist);
    })();
  }, []);

  async function salvar() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const numPeso = peso ? Number(peso) : null;
    const numAltura = altura ? Number(altura) : null;
    const { error } = await supabase.from("profiles").update({
      nome, peso: numPeso, altura: numAltura, meta,
      dias_lembrete: dias, horario_lembrete: horario, tema,
      updated_at: new Date().toISOString(),
    }).eq("user_id", u.user.id);
    
    if (!error && numPeso) {
      const lastWeight = historicoPeso.length > 0 ? historicoPeso[historicoPeso.length - 1].peso : null;
      if (lastWeight !== numPeso) {
        const { data: newHist } = await supabase.from("weight_history").insert({
          user_id: u.user.id,
          peso: numPeso
        }).select().single();
        if (newHist) setHistoricoPeso([...historicoPeso, newHist]);
      }
    }

    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Perfil salvo!");
      configurarLembretes(dias, horario);
    }
  }

  async function pedirNotificacoes() {
    if (!("Notification" in window)) { toast.error("Seu navegador não suporta notificações."); return; }
    const p = await Notification.requestPermission();
    if (p === "granted") toast.success("Notificações ativadas!");
    else toast.error("Permissão negada.");
  }

  function configurarLembretes(dias: string[], horario: string) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (dias.length === 0) return;
    // Agendamento simples: verifica a cada minuto se é hora de notificar
    if ((window as any).__fpReminderInterval) clearInterval((window as any).__fpReminderInterval);
    (window as any).__fpReminderInterval = setInterval(() => {
      const now = new Date();
      const dia = DIAS[now.getDay()];
      const hh = now.getHours().toString().padStart(2,"0");
      const mm = now.getMinutes().toString().padStart(2,"0");
      if (dias.includes(dia) && `${hh}:${mm}` === horario) {
        new Notification("FitPower 💪", { body: "Hora de treinar! Bora cruzar mais um dia rumo aos 5km.", icon: "/icon-192.png" });
      }
    }, 30000);
  }

  function exportarProgresso() {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: logs } = await supabase.from("workout_logs").select("*").eq("user_id", u.user.id).order("data");
      const doc = new jsPDF();
      doc.setFillColor(255,107,53); doc.rect(0,0,210,25,"F");
      doc.setTextColor(255,255,255); doc.setFontSize(20); doc.text("FitPower · Meu Progresso", 14, 17);
      doc.setTextColor(43,43,43); doc.setFontSize(12);
      doc.text(`Atleta: ${nome || "—"}`, 14, 38);
      doc.text(`E-mail: ${email}`, 14, 45);
      doc.text(`Total de treinos: ${logs?.length ?? 0}`, 14, 52);
      const totalMin = (logs ?? []).reduce((a: number, l: any) => a + (l.duracao || 0), 0);
      doc.text(`Minutos totais: ${totalMin}`, 14, 59);
      doc.setFontSize(13); doc.setFont("helvetica","bold");
      doc.text("Histórico", 14, 73);
      doc.setFont("helvetica","normal"); doc.setFontSize(10);
      let y = 82;
      (logs ?? []).forEach((l: any) => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(`${new Date(l.data).toLocaleDateString("pt-BR")} · S${l.semana}-T${l.numero_treino} · ${l.duracao}min · esforço ${l.esforco ?? "-"}/10`, 14, y);
        y += 6;
      });
      doc.save("progresso-fitpower.pdf");
      toast.success("Progresso exportado!");
    })();
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  function toggleTema() {
    const novo = tema === "light" ? "dark" : "light";
    setTemaState(novo); setTheme(novo);
  }

  function toggleDia(d: string) {
    setDias((prev: string[]) => prev.includes(d) ? prev.filter((x: string) => x !== d) : [...prev, d]);
  }

  const p = Number(peso);
  const a = Number(altura);
  let imc = 0;
  let imcClass = "";
  if (p > 0 && a > 0) {
    imc = p / (a * a);
    if (imc < 18.5) imcClass = "Abaixo do peso";
    else if (imc < 25) imcClass = "Peso normal";
    else if (imc < 30) imcClass = "Sobrepeso";
    else imcClass = "Obesidade";
  }

  const chartData = historicoPeso.map((h: any) => ({
    name: new Date(h.data).toLocaleDateString("pt-BR", { month: 'short', day: 'numeric' }),
    peso: h.peso
  }));

  return (
    <div className="px-5 pt-8 pb-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold">Perfil</h1>

      <div className="mt-5 flex items-center gap-4 rounded-2xl bg-card border p-4 shadow-soft">
        <div className="size-14 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground"><UserIcon className="size-6" /></div>
        <div className="min-w-0"><p className="font-bold truncate">{nome || "Atleta"}</p><p className="text-xs text-muted-foreground truncate">{email}</p></div>
      </div>

      <Section title="Dados">
        <Field label="Nome"><input value={nome} onChange={(e) => setNome(e.target.value)} className="input" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso (kg)"><input type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} className="input" /></Field>
          <Field label="Altura (m)"><input type="number" step="0.01" value={altura} onChange={(e) => setAltura(e.target.value)} className="input" placeholder="Ex: 1.75" /></Field>
        </div>
        <Field label="Sua meta"><input value={meta} onChange={(e) => setMeta(e.target.value)} className="input" placeholder="Ex.: Correr meus primeiros 5km" /></Field>
      </Section>

      <Section title="Calculadora de IMC">
        {imc > 0 ? (
          <div className="flex flex-col items-center justify-center py-4 bg-primary/10 rounded-xl">
            <span className="text-3xl font-black text-primary">{imc.toFixed(1)}</span>
            <span className="text-sm font-semibold mt-1 text-primary">{imcClass}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Preencha peso e altura para ver seu IMC.</p>
        )}
      </Section>

      <Section title="Evolução de Peso" icon={Activity}>
        {chartData.length > 0 ? (
          <div className="h-48 w-full mt-2 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" opacity={0.6} />
                <YAxis domain={['auto', 'auto']} fontSize={12} tickLine={false} axisLine={false} width={40} stroke="currentColor" opacity={0.6} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                  labelStyle={{ fontWeight: 'bold', color: 'black' }} 
                  itemStyle={{ color: 'black' }}
                />
                <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--color-primary)" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Salve seu peso para começar o histórico.</p>
        )}
      </Section>

      <Section title="Lembretes de treino" icon={Bell}>
        <p className="text-xs text-muted-foreground mb-3">Receba notificações para não esquecer de treinar.</p>
        <div className="flex gap-1.5 flex-wrap">
          {DIAS.map((d) => (
            <button key={d} type="button" onClick={() => toggleDia(d)}
              className={`px-3 py-1.5 rounded-full border-2 text-sm font-semibold ${dias.includes(d) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
              {d}
            </button>
          ))}
        </div>
        <Field label="Horário"><input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} className="input" /></Field>
        <button onClick={pedirNotificacoes} className="mt-2 text-sm text-primary font-semibold underline">Ativar notificações</button>
      </Section>

      <Section title="Minha assinatura" icon={Crown}>
        {sub.loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : sub.active ? (
          <div className="space-y-1">
            <p className="font-semibold capitalize">Plano {sub.plano ?? "FitPower"}</p>
            <p className="text-sm text-secondary font-semibold">Assinatura ativa</p>
            {sub.currentPeriodEnd && (
              <p className="text-xs text-muted-foreground">
                Renova em {new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR")}
              </p>
            )}
            <button
              onClick={() =>
                toast.info("Gerenciamento de assinatura em breve", {
                  description: "Ative a integração de pagamentos para abrir o portal do cliente.",
                })
              }
              className="mt-2 text-sm text-primary font-semibold underline"
            >
              Gerenciar assinatura
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem uma assinatura ativa. Assine para liberar todos os eBooks, treinos e
              o certificado de 5km.
            </p>
            <button
              onClick={() => navigate({ to: "/planos" })}
              className="w-full rounded-2xl bg-primary text-primary-foreground font-bold py-3"
            >
              Ver planos · a partir de R$ 9,90
            </button>
          </div>
        )}
      </Section>

      <Section title="Aparência">

        <button onClick={toggleTema} className="flex items-center justify-between w-full">
          <span className="flex items-center gap-2 font-semibold">{tema === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />} Modo {tema === "dark" ? "escuro" : "claro"}</span>
          <span className="text-sm text-muted-foreground">Toque para alternar</span>
        </button>
      </Section>

      <button onClick={salvar} disabled={saving} className="mt-5 w-full flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-bold py-3.5 shadow-glow disabled:opacity-60">
        <Save className="size-4" /> {saving ? "Salvando..." : "Salvar alterações"}
      </button>

      <button onClick={exportarProgresso} className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border-2 font-semibold py-3.5">
        <Download className="size-4" /> Exportar meu progresso em PDF
      </button>

      <button onClick={logout} className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-destructive/40 text-destructive font-semibold py-3.5">
        <LogOut className="size-4" /> Sair
      </button>

      <style>{`.input{width:100%;padding:12px 14px;border-radius:12px;border:2px solid var(--color-border);background:var(--color-card);font-size:15px;outline:none;margin-top:6px}.input:focus{border-color:var(--color-primary)}`}</style>
    </div>
  );
}

function Section({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: React.ComponentType<{className?:string}> }) {
  return (
    <section className="mt-6">
      <h3 className="font-bold flex items-center gap-2 mb-2">{Icon && <Icon className="size-4 text-primary" />}{title}</h3>
      <div className="rounded-2xl bg-card border p-4 shadow-soft space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block text-sm font-semibold">{label}{children}</label>);
}
