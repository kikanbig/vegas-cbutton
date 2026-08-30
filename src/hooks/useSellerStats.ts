import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

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
  return api<SellerStats>("/admin/seller-stats", {
    method: "POST",
    body: JSON.stringify({ seller_id: sellerId }),
  });
}

export function useSellerStats(sellerId: string | null) {
  return useQuery({
    queryKey: ["seller-stats", sellerId],
    queryFn: () => fetchSellerStats(sellerId!),
    enabled: !!sellerId,
  });
}
