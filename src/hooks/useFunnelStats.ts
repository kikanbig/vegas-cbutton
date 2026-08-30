import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FunnelTotals {
  clients: number;
  consultations: number;
  proposals: number;
  projects: number;
  refusals: number;
  deals: number;
}

export interface FunnelSellerRow {
  user_id: string;
  name: string;
  clients: number;
  consultations: number;
  proposals: number;
  projects: number;
  refusals: number;
  deals: number;
}

export interface FunnelStats {
  totals: FunnelTotals;
  byType: Record<string, number>;
  byOutcome: Record<string, number>;
  byReason: Record<string, number>;
  bySeller: FunnelSellerRow[];
}

async function fetchFunnelStats(): Promise<FunnelStats> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await supabase.functions.invoke("admin-funnel-stats", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data as FunnelStats;
}

export function useFunnelStats() {
  return useQuery({
    queryKey: ["admin-funnel-stats"],
    queryFn: fetchFunnelStats,
    refetchInterval: 60000,
  });
}
