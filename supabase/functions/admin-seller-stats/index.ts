import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function toLocalDate(isoString: string, offsetHours = 3): string {
  const d = new Date(isoString);
  d.setUTCHours(d.getUTCHours() + offsetHours);
  return d.toISOString().slice(0, 10);
}

function toLocalMonth(isoString: string, offsetHours = 3): string {
  const d = new Date(isoString);
  d.setUTCHours(d.getUTCHours() + offsetHours);
  return d.toISOString().slice(0, 7);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { seller_id } = await req.json();
    if (!seller_id) {
      return new Response(JSON.stringify({ error: "seller_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller identity via JWT claims (signing-keys compatible)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all presses for this seller
    const { data: presses, error: pressError } = await adminClient
      .from("button_presses")
      .select("*")
      .eq("user_id", seller_id)
      .order("pressed_at", { ascending: true });

    if (pressError) throw new Error(pressError.message);

    const records = presses ?? [];

    // Daily aggregation
    const dailyMap: Record<string, { clients: number; people: number }> = {};
    for (const p of records) {
      const day = toLocalDate(p.pressed_at);
      if (!dailyMap[day]) dailyMap[day] = { clients: 0, people: 0 };
      dailyMap[day].clients += 1;
      dailyMap[day].people += p.people_count;
    }
    const daily = Object.entries(dailyMap)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Weekly aggregation (ISO week start = Monday)
    const weeklyMap: Record<string, { clients: number; people: number }> = {};
    for (const p of records) {
      const d = new Date(p.pressed_at);
      d.setUTCHours(d.getUTCHours() + 3);
      const dayOfWeek = d.getUTCDay();
      const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setUTCDate(diff);
      const weekKey = monday.toISOString().slice(0, 10);
      if (!weeklyMap[weekKey]) weeklyMap[weekKey] = { clients: 0, people: 0 };
      weeklyMap[weekKey].clients += 1;
      weeklyMap[weekKey].people += p.people_count;
    }
    const weekly = Object.entries(weeklyMap)
      .map(([week, v]) => ({ week, ...v }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // Monthly aggregation
    const monthlyMap: Record<string, { clients: number; people: number }> = {};
    for (const p of records) {
      const month = toLocalMonth(p.pressed_at);
      if (!monthlyMap[month]) monthlyMap[month] = { clients: 0, people: 0 };
      monthlyMap[month].clients += 1;
      monthlyMap[month].people += p.people_count;
    }
    const monthly = Object.entries(monthlyMap)
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Summary
    const totalClients = records.length;
    const totalPeople = records.reduce((s, p) => s + p.people_count, 0);

    // ── Work & Break stats ──
    const { data: shifts, error: shiftError } = await adminClient
      .from("seller_shifts")
      .select("*")
      .eq("user_id", seller_id)
      .order("started_at", { ascending: true });

    if (shiftError) throw new Error(shiftError.message);

    const { data: breaks, error: breakError } = await adminClient
      .from("seller_breaks")
      .select("*")
      .eq("user_id", seller_id)
      .order("started_at", { ascending: true });

    if (breakError) throw new Error(breakError.message);

    const shiftRecords = shifts ?? [];
    const breakRecords = breaks ?? [];

    // Calculate work time per shift (shift duration minus breaks)
    let totalWorkSeconds = 0;
    let totalBreakCount = 0;
    let totalBreakSeconds = 0;
    const dailyMap2: Record<string, { workSeconds: number; breakCount: number; breakSeconds: number }> = {};

    for (const s of shiftRecords) {
      const start = new Date(s.started_at);
      const end = s.ended_at ? new Date(s.ended_at) : new Date();
      const shiftSec = Math.round((end.getTime() - start.getTime()) / 1000);

      // Sum breaks for this shift
      const shiftBreaks = breakRecords.filter((b: any) => b.shift_id === s.id);
      let shiftBreakSec = 0;
      for (const b of shiftBreaks) {
        const bStart = new Date(b.started_at);
        const bEnd = b.ended_at ? new Date(b.ended_at) : new Date();
        const bSec = Math.round((bEnd.getTime() - bStart.getTime()) / 1000);
        shiftBreakSec += bSec;
        totalBreakCount += 1;
        totalBreakSeconds += bSec;
      }

      const workSec = Math.max(0, shiftSec - shiftBreakSec);
      totalWorkSeconds += workSec;

      const day = toLocalDate(s.started_at);
      if (!dailyMap2[day]) dailyMap2[day] = { workSeconds: 0, breakCount: 0, breakSeconds: 0 };
      dailyMap2[day].workSeconds += workSec;
      dailyMap2[day].breakCount += shiftBreaks.length;
      dailyMap2[day].breakSeconds += shiftBreakSec;
    }

    const timeDaily = Object.entries(dailyMap2)
      .map(([date, v]) => ({ date, workSeconds: v.workSeconds, breakCount: v.breakCount, breakSeconds: v.breakSeconds }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Weekly time aggregation (ISO week start = Monday)
    const timeWeeklyMap: Record<string, { workSeconds: number; breakCount: number; breakSeconds: number }> = {};
    for (const td of timeDaily) {
      const d = new Date(td.date + "T12:00:00Z");
      const dayOfWeek = d.getUTCDay();
      const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setUTCDate(diff);
      const weekKey = monday.toISOString().slice(0, 10);
      if (!timeWeeklyMap[weekKey]) timeWeeklyMap[weekKey] = { workSeconds: 0, breakCount: 0, breakSeconds: 0 };
      timeWeeklyMap[weekKey].workSeconds += td.workSeconds;
      timeWeeklyMap[weekKey].breakCount += td.breakCount;
      timeWeeklyMap[weekKey].breakSeconds += td.breakSeconds;
    }
    const timeWeekly = Object.entries(timeWeeklyMap)
      .map(([week, v]) => ({ week, ...v }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // Monthly time aggregation
    const timeMonthlyMap: Record<string, { workSeconds: number; breakCount: number; breakSeconds: number }> = {};
    for (const td of timeDaily) {
      const monthKey = td.date.slice(0, 7);
      if (!timeMonthlyMap[monthKey]) timeMonthlyMap[monthKey] = { workSeconds: 0, breakCount: 0, breakSeconds: 0 };
      timeMonthlyMap[monthKey].workSeconds += td.workSeconds;
      timeMonthlyMap[monthKey].breakCount += td.breakCount;
      timeMonthlyMap[monthKey].breakSeconds += td.breakSeconds;
    }
    const timeMonthly = Object.entries(timeMonthlyMap)
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const timeSummary = {
      totalBreaks: totalBreakCount,
      totalBreakSeconds,
      avgBreakSeconds: totalBreakCount > 0 ? Math.round(totalBreakSeconds / totalBreakCount) : 0,
      totalWorkSeconds,
    };

    return new Response(
      JSON.stringify({ totalClients, totalPeople, daily, weekly, monthly, timeSummary, timeDaily, timeWeekly, timeMonthly }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
