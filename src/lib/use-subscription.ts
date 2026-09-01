import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import type { PlanoId } from "./plans";

export type SubscriptionState = {
  active: boolean;
  plano: PlanoId | null;
  status: string | null;
  currentPeriodEnd: string | null;
  loading: boolean;
};

const ACTIVE_STATUS = ["active", "trialing"];

export function useSubscription(): SubscriptionState {
  const { user, loading } = useAuth();
  const [state, setState] = useState<Omit<SubscriptionState, "loading">>({
    active: false,
    plano: null,
    status: null,
    currentPeriodEnd: null,
  });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setState({ active: false, plano: null, status: null, currentPeriodEnd: null });
      setChecking(false);
      return;
    }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("subscribers")
        .select("plano, status, current_period_end")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!alive) return;
      const row = data as
        | { plano: string | null; status: string | null; current_period_end: string | null }
        | null;
      const notExpired =
        !row?.current_period_end || new Date(row.current_period_end).getTime() > Date.now();
      setState({
        active: !!row && ACTIVE_STATUS.includes(row.status ?? "") && notExpired,
        plano: (row?.plano as PlanoId | null) ?? null,
        status: row?.status ?? null,
        currentPeriodEnd: row?.current_period_end ?? null,
      });
      setChecking(false);
    })();
    return () => {
      alive = false;
    };
  }, [user, loading]);

  return { ...state, loading: loading || checking };
}
