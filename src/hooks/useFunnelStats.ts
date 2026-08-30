import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

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
  return api<FunnelStats>("/admin/funnel");
}

export function useFunnelStats() {
  return useQuery({
    queryKey: ["admin-funnel-stats"],
    queryFn: fetchFunnelStats,
    refetchInterval: 60000,
  });
}
