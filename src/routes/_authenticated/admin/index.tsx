import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, BookOpen, Dumbbell, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, ebooks: 0, workouts: 0, completed: 0 });

  useEffect(() => {
    (async () => {
      const [u, e, w, c] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("ebooks").select("*", { count: "exact", head: true }),
        supabase.from("workout_logs").select("*", { count: "exact", head: true }),
        supabase.from("workout_logs").select("*", { count: "exact", head: true }).eq("concluido", true),
      ]);
      setStats({
        users: u.count ?? 0,
        ebooks: e.count ?? 0,
        workouts: w.count ?? 0,
        completed: c.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { label: "Usuários", value: stats.users, icon: Users, color: "text-primary" },
    { label: "Produtos (eBooks)", value: stats.ebooks, icon: BookOpen, color: "text-secondary" },
    { label: "Treinos registrados", value: stats.workouts, icon: Dumbbell, color: "text-accent" },
    { label: "Treinos concluídos", value: stats.completed, icon: Activity, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <c.icon className={`size-5 mb-2 ${c.color}`} />
          <div className="text-2xl font-bold">{c.value}</div>
          <div className="text-xs text-muted-foreground">{c.label}</div>
        </Card>
      ))}
    </div>
  );
}
