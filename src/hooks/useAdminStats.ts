import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SellerStat {
  user_id: string;
  name: string;
  email: string;
  company: string;
  total_clients: number;
  total_people: number;
  days_active: number;
  is_admin: boolean;
  is_on_shift: boolean;
  is_on_break: boolean;
  break_started_at: string | null;
}

export interface DailyStat {
  date: string;
  clients: number;
  people: number;
}

export interface MonthlyStat {
  month: string;
  clients: number;
  people: number;
}

export interface AdminStats {
  totalUsers: number;
  totalClients: number;
  totalPeople: number;
  avgPeoplePerClient: number;
  activeSellers: number;
  sellers: SellerStat[];
  daily: DailyStat[];
  monthly: MonthlyStat[];
}

async function fetchAdminStats(): Promise<AdminStats> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await supabase.functions.invoke("admin-stats", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data as AdminStats;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchAdminStats,
    refetchInterval: 60000,
  });
}
