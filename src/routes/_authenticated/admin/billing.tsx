import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Receipt } from "lucide-react";
import { PLANOS } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/admin/billing")({
  component: AdminBilling,
});

type Row = {
  id: string;
  email: string | null;
  plano: string | null;
  status: string;
  current_period_end: string | null;
  created_at: string;
};

const ACTIVE = ["active", "trialing"];

function AdminBilling() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("subscribers")
        .select("id, email, plano, status, current_period_end, created_at")
        .order("created_at", { ascending: false });
      setRows((data as any[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const ativos = rows.filter((r) => ACTIVE.includes(r.status));
  const mrr = ativos.reduce((acc, r) => {
    const p = PLANOS.find((x) => x.id === r.plano);
    if (!p) return acc;
    return acc + (p.id === "anual" ? p.preco / 12 : p.preco);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Assinaturas ativas</div>
          <div className="text-2xl font-bold">{ativos.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Receita recorrente (mês)</div>
          <div className="text-2xl font-bold">
            {mrr.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total de assinantes</div>
          <div className="text-2xl font-bold">{rows.length}</div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold flex items-center gap-2">
          <Receipt className="size-4 text-primary" /> Assinantes
        </h2>
        {loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhuma assinatura registrada ainda. Ative a integração de pagamentos para começar a
            receber assinaturas dos planos mensal (R$ 9,90) e anual (R$ 99,00).
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">E-mail</th>
                  <th className="py-2 pr-3">Plano</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Renova em</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2 pr-3">{r.email ?? "—"}</td>
                    <td className="py-2 pr-3 capitalize">{r.plano ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          ACTIVE.includes(r.status)
                            ? "bg-secondary/15 text-secondary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2">
                      {r.current_period_end
                        ? new Date(r.current_period_end).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
