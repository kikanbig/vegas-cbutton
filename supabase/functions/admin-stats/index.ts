import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
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

    // Verify admin role
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

    // Call SQL aggregation functions — no row limits, fast
    const [totalRes, dailyRes, monthlyRes, sellersRes, usersRes, profilesRes, rolesRes, shiftsRes, breaksRes] = await Promise.all([
      userClient.rpc("admin_get_total_stats"),
      userClient.rpc("admin_get_daily_stats"),
      userClient.rpc("admin_get_monthly_stats"),
      userClient.rpc("admin_get_seller_stats"),
      adminClient.auth.admin.listUsers({ perPage: 1000 }),
      adminClient.from("profiles").select("user_id, full_name, company"),
      adminClient.from("user_roles").select("user_id, role"),
      adminClient.from("seller_shifts").select("user_id, started_at, ended_at, id").is("ended_at", null),
      adminClient.from("seller_breaks").select("user_id, shift_id, started_at").is("ended_at", null),
    ]);

    if (totalRes.error) throw new Error(totalRes.error.message);
    if (dailyRes.error) throw new Error(dailyRes.error.message);
    if (monthlyRes.error) throw new Error(monthlyRes.error.message);
    if (sellersRes.error) throw new Error(sellersRes.error.message);

    const totals = totalRes.data;
    const daily = dailyRes.data;
    const monthly = monthlyRes.data;
    const sellerAggs: any[] = sellersRes.data;

    const authUsers = usersRes.data?.users ?? [];
    const emailMap: Record<string, string> = {};
    for (const u of authUsers) {
      if (u.id && u.email) emailMap[u.id] = u.email;
    }

    const profiles = profilesRes.data ?? [];
    const roles = rolesRes.data ?? [];
    const adminUserIds = new Set(
      roles.filter((r: any) => r.role === "admin").map((r: any) => r.user_id)
    );

    // Active shifts and breaks
    const activeShifts = shiftsRes.data ?? [];
    const activeBreaks = breaksRes.data ?? [];
    const onShiftUserIds = new Set(activeShifts.map((s: any) => s.user_id));
    const onBreakUserIds = new Set(activeBreaks.map((b: any) => b.user_id));
    const breakStartMap: Record<string, string> = {};
    for (const b of activeBreaks) {
      breakStartMap[b.user_id] = b.started_at;
    }

    // Build seller list: merge SQL aggregation with emails & admin status
    const sellerIdsWithPresses = new Set(sellerAggs.map((s: any) => s.user_id));

    const sellers = sellerAggs.map((s: any) => ({
      user_id: s.user_id,
      name: s.name,
      email: emailMap[s.user_id] || "—",
      company: s.company,
      total_clients: s.total_clients,
      total_people: s.total_people,
      days_active: s.days_active,
      is_admin: adminUserIds.has(s.user_id),
      is_on_shift: onShiftUserIds.has(s.user_id),
      is_on_break: onBreakUserIds.has(s.user_id),
      break_started_at: breakStartMap[s.user_id] || null,
    }));

    // Add inactive sellers (profiles without presses)
    for (const prof of profiles) {
      if (!sellerIdsWithPresses.has(prof.user_id)) {
        sellers.push({
          user_id: prof.user_id,
          name: prof.full_name || "—",
          email: emailMap[prof.user_id] || "—",
          company: prof.company || "—",
          total_clients: 0,
          total_people: 0,
          days_active: 0,
          is_admin: adminUserIds.has(prof.user_id),
          is_on_shift: onShiftUserIds.has(prof.user_id),
          is_on_break: onBreakUserIds.has(prof.user_id),
          break_started_at: breakStartMap[prof.user_id] || null,
        });
      }
    }

    return new Response(
      JSON.stringify({
        totalUsers: authUsers.length,
        totalClients: totals.totalClients,
        totalPeople: totals.totalPeople,
        avgPeoplePerClient: Number(totals.avgPeoplePerClient),
        activeSellers: sellers.filter(s => s.total_clients > 0).length,
        sellers,
        daily,
        monthly,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
