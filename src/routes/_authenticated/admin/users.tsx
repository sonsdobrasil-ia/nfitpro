import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldOff, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

type Row = {
  user_id: string;
  nome: string | null;
  email: string | null;
  created_at: string;
  isAdmin: boolean;
};

function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("user_id,nome,email,created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role").eq("role", "admin"),
    ]);
    const admins = new Set((roles ?? []).map((r) => r.user_id));
    setRows((profiles ?? []).map((p) => ({ ...p, isAdmin: admins.has(p.user_id) })));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleAdmin = async (r: Row) => {
    if (r.isAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", r.user_id).eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Admin removido");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: r.user_id, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Promovido a admin");
    }
    load();
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Usuários ({rows.length})</h2>
      <div className="grid gap-2">
        {rows.map((r) => (
          <Card key={r.user_id} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{r.nome ?? "—"}</div>
              <div className="text-xs text-muted-foreground truncate">{r.email}</div>
            </div>
            {r.isAdmin && <Badge variant="secondary">Admin</Badge>}
            <Button size="sm" variant="outline" onClick={() => toggleAdmin(r)}>
              {r.isAdmin ? (
                <>
                  <ShieldOff className="size-4 mr-1" />
                  Revogar
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4 mr-1" />
                  Tornar admin
                </>
              )}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
