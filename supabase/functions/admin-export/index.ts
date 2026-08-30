import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FUNNEL_FROM_ISO = "2026-06-30T21:00:00.000Z"; // 01.07.2026 00:00 Europe/Minsk
const FUNNEL_FROM_LABEL = "2026-07-01";
const PAGE_SIZE = 1000;

const TYPE_LABELS: Record<string, string> = {
  express: "Экспресс-консультация",
  deep: "Глубинная проработка",
};

const OUTCOME_LABELS: Record<string, string> = {
  proposal_sent: "Сформировано КП",
  project_offered: "Проект / встреча",
  refused: "Отказ клиента",
};

const REASON_LABELS: Record<string, string> = {
  price: "Не соответствует цена",
  product: "Не нравится товар",
  other: "Без указания причин",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceKey || !anonKey) {
      throw new Error("Missing backend configuration");
    }

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

    // Verify admin
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

    const { date_from, date_to } = await req.json();
    if (!date_from || !date_to) {
      return new Response(JSON.stringify({ error: "date_from and date_to required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dateToEnd = date_to + "T23:59:59.999Z";

    const fetchPresses = async (fromIso: string, toIso: string) => {
      const rows: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await adminClient
          .from("button_presses")
          .select("id, user_id, sector, people_count, pressed_at")
          .gte("pressed_at", fromIso)
          .lte("pressed_at", toIso)
          .order("pressed_at", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return rows;
    };

    // Old export range stays exactly as selected. New funnel report always starts on 01.07.2026.
    const [allPresses, funnelPresses] = await Promise.all([
      fetchPresses(date_from, dateToEnd),
      fetchPresses(FUNNEL_FROM_ISO, dateToEnd),
    ]);

    // Fetch profiles, auth users, breaks, and shifts
    const [profilesRes, usersRes, breaksRes, shiftsRes] = await Promise.all([
      adminClient.from("profiles").select("user_id, full_name, company"),
      adminClient.auth.admin.listUsers({ perPage: 1000 }),
      adminClient.from("seller_breaks").select("*, seller_shifts!inner(user_id)")
        .gte("started_at", date_from)
        .lte("started_at", date_to + "T23:59:59.999Z")
        .order("started_at", { ascending: true }),
      adminClient.from("seller_shifts").select("*")
        .gte("started_at", date_from)
        .lte("started_at", date_to + "T23:59:59.999Z")
        .order("started_at", { ascending: true }),
    ]);

    const profiles = profilesRes.data ?? [];
    const authUsers = usersRes.data?.users ?? [];
    const breakRecords = breaksRes.data ?? [];
    const shiftRecords = shiftsRes.data ?? [];

    const profileMap: Record<string, { name: string; company: string }> = {};
    for (const p of profiles) {
      profileMap[p.user_id] = { name: p.full_name || "—", company: p.company || "—" };
    }
    const emailMap: Record<string, string> = {};
    for (const u of authUsers) {
      if (u.id && u.email) emailMap[u.id] = u.email;
    }

    const fetchConsultations = async () => {
      const rows: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await adminClient
          .from("client_consultations")
          .select("id, button_press_id, user_id, consultation_type, outcome, refusal_reason, recorded_at, button_presses!inner(id, user_id, sector, people_count, pressed_at)")
          .gte("button_presses.pressed_at", FUNNEL_FROM_ISO)
          .lte("button_presses.pressed_at", dateToEnd)
          .order("recorded_at", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return rows;
    };

    const fetchDeals = async () => {
      const rows: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await adminClient
          .from("client_deals")
          .select("id, button_press_id, user_id, closed_at, button_presses!inner(id, user_id, pressed_at)")
          .gte("button_presses.pressed_at", FUNNEL_FROM_ISO)
          .lte("button_presses.pressed_at", dateToEnd)
          .order("closed_at", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return rows;
    };

    const [rawConsultations, rawDeals] = await Promise.all([
      fetchConsultations(),
      fetchDeals(),
    ]);

    // Build seller summary
    const sellerAgg: Record<string, { clients: number; people: number; days: Set<string> }> = {};
    for (const p of allPresses) {
      if (!sellerAgg[p.user_id]) {
        sellerAgg[p.user_id] = { clients: 0, people: 0, days: new Set() };
      }
      sellerAgg[p.user_id].clients++;
      sellerAgg[p.user_id].people += p.people_count;
      sellerAgg[p.user_id].days.add(p.pressed_at.slice(0, 10));
    }

    const sellers = Object.entries(sellerAgg).map(([uid, agg]) => ({
      user_id: uid,
      name: profileMap[uid]?.name || "—",
      email: emailMap[uid] || "—",
      company: profileMap[uid]?.company || "—",
      total_clients: agg.clients,
      total_people: agg.people,
      days_active: agg.days.size,
    })).sort((a, b) => b.total_people - a.total_people);

    // Enrich presses with seller info
    const presses = allPresses.map((p) => ({
      date: p.pressed_at,
      seller_name: profileMap[p.user_id]?.name || "—",
      seller_email: emailMap[p.user_id] || "—",
      company: profileMap[p.user_id]?.company || "—",
      sector: p.sector,
      people_count: p.people_count,
    }));

    // Build breaks from seller_breaks table
    const breaks = breakRecords.map((b: any) => {
      const uid = b.user_id;
      const bStart = new Date(b.started_at);
      const bEnd = b.ended_at ? new Date(b.ended_at) : null;
      const breakSec = bEnd ? Math.round((bEnd.getTime() - bStart.getTime()) / 1000) : null;
      return {
        seller_name: profileMap[uid]?.name || "—",
        seller_email: emailMap[uid] || "—",
        company: profileMap[uid]?.company || "—",
        break_start: b.started_at,
        break_end: b.ended_at,
        break_seconds: breakSec,
      };
    });

    // Build shifts export
    const shiftsExport = shiftRecords.map((s: any) => {
      const sStart = new Date(s.started_at);
      const sEnd = s.ended_at ? new Date(s.ended_at) : null;
      const shiftSec = sEnd ? Math.round((sEnd.getTime() - sStart.getTime()) / 1000) : null;
      return {
        seller_name: profileMap[s.user_id]?.name || "—",
        seller_email: emailMap[s.user_id] || "—",
        company: profileMap[s.user_id]?.company || "—",
        shift_start: s.started_at,
        shift_end: s.ended_at,
        shift_seconds: shiftSec,
      };
    });

    const funnelSellerAgg: Record<string, {
      clients: number;
      consultations: number;
      proposals: number;
      projects: number;
      refusals: number;
      deals: number;
    }> = {};

    const ensureFunnelSeller = (uid: string) => {
      if (!funnelSellerAgg[uid]) {
        funnelSellerAgg[uid] = { clients: 0, consultations: 0, proposals: 0, projects: 0, refusals: 0, deals: 0 };
      }
      return funnelSellerAgg[uid];
    };

    for (const p of funnelPresses) ensureFunnelSeller(p.user_id).clients++;

    const byType: Record<string, number> = {};
    const byOutcome: Record<string, number> = {};
    const byReason: Record<string, number> = {};

    for (const c of rawConsultations) {
      const press = c.button_presses;
      const uid = c.user_id || press?.user_id;
      if (!uid) continue;
      const agg = ensureFunnelSeller(uid);
      agg.consultations++;
      if (c.outcome === "proposal_sent") agg.proposals++;
      if (c.outcome === "project_offered") agg.projects++;
      if (c.outcome === "refused") agg.refusals++;
      byType[c.consultation_type] = (byType[c.consultation_type] ?? 0) + 1;
      byOutcome[c.outcome] = (byOutcome[c.outcome] ?? 0) + 1;
      if (c.refusal_reason) byReason[c.refusal_reason] = (byReason[c.refusal_reason] ?? 0) + 1;
    }

    for (const d of rawDeals) {
      const press = d.button_presses;
      const uid = d.user_id || press?.user_id;
      if (uid) ensureFunnelSeller(uid).deals++;
    }

    const funnelSellers = Object.entries(funnelSellerAgg).map(([uid, agg]) => ({
      user_id: uid,
      name: profileMap[uid]?.name || "—",
      email: emailMap[uid] || "—",
      company: profileMap[uid]?.company || "—",
      clients: agg.clients,
      consultations: agg.consultations,
      proposals: agg.proposals,
      projects: agg.projects,
      refusals: agg.refusals,
      deals: agg.deals,
    })).sort((a, b) => b.clients - a.clients);

    const consultations = rawConsultations.map((c) => {
      const press = c.button_presses;
      const uid = c.user_id || press?.user_id;
      return {
        client_date: press?.pressed_at ?? null,
        seller_name: profileMap[uid]?.name || "—",
        seller_email: emailMap[uid] || "—",
        company: profileMap[uid]?.company || "—",
        sector: press?.sector ?? null,
        people_count: press?.people_count ?? null,
        consultation_type: c.consultation_type,
        consultation_type_label: TYPE_LABELS[c.consultation_type] || c.consultation_type,
        outcome: c.outcome,
        outcome_label: OUTCOME_LABELS[c.outcome] || c.outcome,
        refusal_reason: c.refusal_reason,
        refusal_reason_label: c.refusal_reason ? (REASON_LABELS[c.refusal_reason] || c.refusal_reason) : null,
        recorded_at: c.recorded_at,
      };
    }).sort((a, b) => String(a.recorded_at).localeCompare(String(b.recorded_at)));

    return new Response(
      JSON.stringify({
        totalClients: allPresses.length,
        totalPeople: allPresses.reduce((s, p) => s + p.people_count, 0),
        sellers,
        presses,
        breaks,
        shifts: shiftsExport,
        funnel: {
          period_from: FUNNEL_FROM_LABEL,
          period_to: date_to,
          totals: {
            clients: funnelPresses.length,
            consultations: rawConsultations.length,
            proposals: rawConsultations.filter((c) => c.outcome === "proposal_sent").length,
            projects: rawConsultations.filter((c) => c.outcome === "project_offered").length,
            refusals: rawConsultations.filter((c) => c.outcome === "refused").length,
            deals: rawDeals.length,
          },
          byType,
          byOutcome,
          byReason,
          bySeller: funnelSellers,
        },
        consultations,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("admin-export error:", (e as Error).message, (e as Error).stack);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
