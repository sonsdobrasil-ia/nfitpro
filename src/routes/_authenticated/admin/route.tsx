import { createFileRoute, Outlet, Link, useLocation, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Shield, BookOpen, Users, Receipt, LayoutDashboard, CreditCard, Database } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: AdminLayout,
});

const tabs: { to: string; icon: any; label: string; exact?: boolean }[] = [
  { to: "/admin", icon: LayoutDashboard, label: "Painel", exact: true },
  { to: "/admin/ebooks", icon: BookOpen, label: "Produtos" },
  { to: "/admin/plans", icon: CreditCard, label: "Planos" },
  { to: "/admin/users", icon: Users, label: "Usuários" },
  { to: "/admin/billing", icon: Receipt, label: "Faturamento" },
  { to: "/admin/migration", icon: Database, label: "Migração" },
];

function AdminLayout() {
  const { pathname } = useLocation();
  return (
    <div className="max-w-4xl mx-auto px-4 pt-6">
      <header className="flex items-center gap-2 mb-4">
        <Shield className="size-6 text-primary" />
        <h1 className="text-2xl font-bold">Administração</h1>
      </header>
      <nav className="flex gap-2 overflow-x-auto pb-2 mb-4 border-b">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to as any}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap transition ${
                active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <t.icon className="size-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
