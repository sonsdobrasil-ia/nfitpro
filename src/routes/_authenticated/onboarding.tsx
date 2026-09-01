import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const SLIDES = [
  { emoji: "🏃", titulo: "Bem-vindo à FitPower", texto: "Vamos te levar do sofá aos 5km em 30 dias com 3 treinos por semana." },
  { emoji: "⏱️", titulo: "Timer guiado", texto: "Cada treino alterna correr e caminhar automaticamente. Você só precisa seguir." },
  { emoji: "📈", titulo: "Você no comando", texto: "Acompanhe seu progresso, leia o eBook e conquiste seu certificado." },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  async function finalizar() {
    const { data: u } = await supabase.auth.getUser();
    if (u.user) await supabase.from("profiles").update({ onboarding_done: true }).eq("user_id", u.user.id);
    navigate({ to: "/dashboard" });
  }

  const slide = SLIDES[step];

  return (
    <div className="min-h-screen flex flex-col px-6 pt-10 pb-12 max-w-xl mx-auto w-full">
      <Logo />
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="text-7xl mb-6">{slide.emoji}</div>
        <h1 className="text-3xl font-bold">{slide.titulo}</h1>
        <p className="mt-3 text-muted-foreground text-lg">{slide.texto}</p>
      </div>
      <div className="flex gap-1.5 justify-center mb-6">
        {SLIDES.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-primary" : "w-1.5 bg-muted-foreground/30"}`} />
        ))}
      </div>
      <button
        onClick={() => step < SLIDES.length - 1 ? setStep(step + 1) : finalizar()}
        className="w-full rounded-2xl bg-primary text-primary-foreground font-bold py-4 text-lg shadow-glow flex items-center justify-center gap-2"
      >
        {step < SLIDES.length - 1 ? "Próximo" : "Bora começar!"} <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
