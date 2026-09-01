import { Link, useLocation } from "@tanstack/react-router";
import { Home, Dumbbell, TrendingUp, BookOpen, User, Shield } from "lucide-react";
import { useIsAdmin } from "@/lib/use-admin";

const baseItems = [
  { to: "/dashboard", icon: Home, label: "Início" },
  { to: "/workouts", icon: Dumbbell, label: "Treinos" },
  { to: "/progress", icon: TrendingUp, label: "Progresso" },
  { to: "/ebook", icon: BookOpen, label: "eBook" },
  { to: "/profile", icon: User, label: "Perfil" },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  const { isAdmin } = useIsAdmin();
  const items = isAdmin
    ? [...baseItems.slice(0, 4), { to: "/admin", icon: Shield, label: "Admin" } as const, baseItems[4]]
    : baseItems;
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur safe-bottom">
      <ul className={`grid max-w-xl mx-auto ${isAdmin ? "grid-cols-6" : "grid-cols-5"}`}>
        {items.map(({ to, icon: Icon, label }) => {
          const active = pathname.startsWith(to);
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`size-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className={active ? "font-semibold" : ""}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
