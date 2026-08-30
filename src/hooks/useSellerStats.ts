import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SellerDailyStat {
  date: string;
  clients: number;
  people: number;
}

export interface SellerWeeklyStat {
  week: string;
  clients: number;
  people: number;
}

export interface SellerMonthlyStat {
  month: string;
  clients: number;
  people: number;
}

export interface TimeDailyStat {
  date: string;
  workSeconds: number;
  breakCount: number;
  breakSeconds: number;
}

export interface TimeWeeklyStat {
  week: string;
  workSeconds: number;
  breakCount: number;
  breakSeconds: number;
}

export interface TimeMonthlyStat {
  month: string;
  workSeconds: number;
  breakCount: number;
  breakSeconds: number;
}

export interface TimeSummary {
  totalBreaks: number;
  totalBreakSeconds: number;
  avgBreakSeconds: number;
  totalWorkSeconds: number;
}

export interface SellerStats {
  totalClients: number;
  totalPeople: number;
  daily: SellerDailyStat[];
  weekly: SellerWeeklyStat[];
  monthly: SellerMonthlyStat[];
  timeSummary: TimeSummary;
  timeDaily: TimeDailyStat[];
  timeWeekly: TimeWeeklyStat[];
  timeMonthly: TimeMonthlyStat[];
}

async function fetchSellerStats(sellerId: string): Promise<SellerStats> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await supabase.functions.invoke("admin-seller-stats", {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: { seller_id: sellerId },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data as SellerStats;
}

export function useSellerStats(sellerId: string | null) {
  return useQuery({
    queryKey: ["seller-stats", sellerId],
    queryFn: () => fetchSellerStats(sellerId!),
    enabled: !!sellerId,
  });
}
