import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlanRow = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  preco: number;
  intervalo: string;
  cakto_offer_id: string | null;
  checkout_url: string | null;
  destaque: boolean;
  ativo: boolean;
  ordem: number;
};

export function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function periodoLabel(intervalo: string) {
  return intervalo === "anual" ? "/ano" : "/mês";
}

export function usePlans(onlyActive = true) {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    let query = supabase
      .from("plans")
      .select("id, nome, slug, descricao, preco, intervalo, cakto_offer_id, checkout_url, destaque, ativo, ordem")
      .order("ordem", { ascending: true });
    if (onlyActive) query = query.eq("ativo", true);
    const { data } = await query;
    setPlans(((data as PlanRow[] | null) ?? []).map((p) => ({ ...p, preco: Number(p.preco) })));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyActive]);

  return { plans, loading, reload: load };
}
