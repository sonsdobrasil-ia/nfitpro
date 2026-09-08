import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { pathname } = useLocation();
  // Esconde a navegação inferior apenas na tela de leitura do eBook (/ebook/:id)
  const isReading = pathname.startsWith("/ebook/") && pathname !== "/ebook";
  return (
    <div className={`min-h-screen bg-background ${isReading ? "" : "pb-20"}`}>
      <Outlet />
      {!isReading && <BottomNav />}
    </div>
  );
}

