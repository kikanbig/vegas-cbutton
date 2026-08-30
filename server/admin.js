import { Router } from "express";

function toLocalDate(isoString, offsetHours = 3) {
  const d = new Date(isoString);
  d.setUTCHours(d.getUTCHours() + offsetHours);
  return d.toISOString().slice(0, 10);
}

function toLocalMonth(isoString, offsetHours = 3) {
  const d = new Date(isoString);
  d.setUTCHours(d.getUTCHours() + offsetHours);
  return d.toISOString().slice(0, 7);
}

const TYPE_LABELS = {
  express: "Экспресс-консультация",
  deep: "Глубинная проработка",
};
const OUTCOME_LABELS = {
  proposal_sent: "Сформировано КП",
  sale: "Продажа",
  project_offered: "Продажа",
  refused: "Отказ клиента",
};

function isSale(outcome) {
  return outcome === "sale" || outcome === "project_offered";
}
const REASON_LABELS = {
  price: "Не соответствует цена",
  product: "Не нравится товар",
  other: "Без указания причин",
};

async function requireAdmin(query, userId) {
  const role = await query(
    `SELECT 1 FROM user_roles WHERE user_id = $1 AND role = 'admin' LIMIT 1`,
    [userId]
  );
  return role.rowCount > 0;
}

export function adminRouter({ query, FUNNEL_FROM }) {
  const router = Router();

  router.use(async (req, res, next) => {
    if (!(await requireAdmin(query, req.user.sub))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  });

  router.get("/stats", async (_req, res) => {
    const [totals, daily, monthly, sellers, users, roles, shifts, breaks] = await Promise.all([
      query(`SELECT COUNT(*)::int AS clients, COALESCE(SUM(people_count),0)::int AS people FROM button_presses`),
      query(`
        SELECT to_char((pressed_at AT TIME ZONE 'Europe/Minsk'), 'YYYY-MM-DD') AS date,
               COUNT(*)::int AS clients,
               COALESCE(SUM(people_count),0)::int AS people
        FROM button_presses
        GROUP BY 1 ORDER BY 1
      `),
      query(`
        SELECT to_char((pressed_at AT TIME ZONE 'Europe/Minsk'), 'YYYY-MM') AS month,
               COUNT(*)::int AS clients,
               COALESCE(SUM(people_count),0)::int AS people
        FROM button_presses
        GROUP BY 1 ORDER BY 1
      `),
      query(`
        SELECT u.id AS user_id,
               COALESCE(u.full_name, '—') AS name,
               u.email,
               COALESCE(u.company, '—') AS company,
               COUNT(p.id)::int AS total_clients,
               COALESCE(SUM(p.people_count),0)::int AS total_people,
               COUNT(DISTINCT (p.pressed_at AT TIME ZONE 'Europe/Minsk')::date)::int AS days_active
        FROM users u
        LEFT JOIN button_presses p ON p.user_id = u.id
        GROUP BY u.id
        ORDER BY total_clients DESC
      `),
      query(`SELECT id, email, full_name, company FROM users`),
      query(`SELECT user_id FROM user_roles WHERE role = 'admin'`),
      query(`SELECT user_id, id, salon FROM seller_shifts WHERE ended_at IS NULL`),
      query(`SELECT user_id, started_at FROM seller_breaks WHERE ended_at IS NULL`),
    ]);

    const adminIds = new Set(roles.rows.map((r) => r.user_id));
    const onShift = new Set(shifts.rows.map((s) => s.user_id));
    const salonByUser = Object.fromEntries(shifts.rows.map((s) => [s.user_id, s.salon || null]));
    const onBreak = new Set(breaks.rows.map((b) => b.user_id));
    const breakStart = Object.fromEntries(breaks.rows.map((b) => [b.user_id, b.started_at]));
    const totalClients = totals.rows[0].clients;
    const totalPeople = totals.rows[0].people;

    res.json({
      totalUsers: users.rows.length,
      totalClients,
      totalPeople,
      avgPeoplePerClient: totalClients ? Number((totalPeople / totalClients).toFixed(2)) : 0,
      activeSellers: sellers.rows.filter((s) => s.total_clients > 0).length,
      sellers: sellers.rows.map((s) => ({
        ...s,
        is_admin: adminIds.has(s.user_id),
        is_on_shift: onShift.has(s.user_id),
        is_on_break: onBreak.has(s.user_id),
        break_started_at: breakStart[s.user_id] || null,
        current_salon: salonByUser[s.user_id] || null,
      })),
      daily: daily.rows,
      monthly: monthly.rows,
    });
  });

  router.get("/funnel", async (_req, res) => {
    const from = FUNNEL_FROM;
    const [totals, byType, byOutcome, byReason, bySeller] = await Promise.all([
      query(
        `SELECT
           (SELECT COUNT(*) FROM button_presses WHERE pressed_at >= $1)::int AS clients,
           (SELECT COUNT(*) FROM client_consultations c JOIN button_presses b ON b.id = c.button_press_id WHERE b.pressed_at >= $1)::int AS consultations,
           (SELECT COUNT(*) FROM client_consultations c JOIN button_presses b ON b.id = c.button_press_id WHERE b.pressed_at >= $1 AND c.outcome = 'proposal_sent')::int AS proposals,
           (SELECT COUNT(*) FROM client_consultations c JOIN button_presses b ON b.id = c.button_press_id WHERE b.pressed_at >= $1 AND c.outcome IN ('sale', 'project_offered'))::int AS projects,
           (SELECT COUNT(*) FROM client_consultations c JOIN button_presses b ON b.id = c.button_press_id WHERE b.pressed_at >= $1 AND c.outcome = 'refused')::int AS refusals,
           (SELECT COUNT(*) FROM client_deals d JOIN button_presses b ON b.id = d.button_press_id WHERE b.pressed_at >= $1)::int AS deals`,
        [from]
      ),
      query(
        `SELECT c.consultation_type AS k, COUNT(*)::int AS v
         FROM client_consultations c JOIN button_presses b ON b.id = c.button_press_id
         WHERE b.pressed_at >= $1 GROUP BY 1`,
        [from]
      ),
      query(
        `SELECT c.outcome AS k, COUNT(*)::int AS v
         FROM client_consultations c JOIN button_presses b ON b.id = c.button_press_id
         WHERE b.pressed_at >= $1 GROUP BY 1`,
        [from]
      ),
      query(
        `SELECT c.refusal_reason AS k, COUNT(*)::int AS v
         FROM client_consultations c JOIN button_presses b ON b.id = c.button_press_id
         WHERE b.pressed_at >= $1 AND c.refusal_reason IS NOT NULL GROUP BY 1`,
        [from]
      ),
      query(
        `SELECT bp.user_id,
                COALESCE(u.full_name, '—') AS name,
                COUNT(DISTINCT bp.id)::int AS clients,
                COUNT(DISTINCT cc.id)::int AS consultations,
                COUNT(DISTINCT cc.id) FILTER (WHERE cc.outcome = 'proposal_sent')::int AS proposals,
                COUNT(DISTINCT cc.id) FILTER (WHERE cc.outcome IN ('sale', 'project_offered'))::int AS projects,
                COUNT(DISTINCT cc.id) FILTER (WHERE cc.outcome = 'refused')::int AS refusals,
                COUNT(DISTINCT cd.id)::int AS deals
         FROM button_presses bp
         LEFT JOIN users u ON u.id = bp.user_id
         LEFT JOIN client_consultations cc ON cc.button_press_id = bp.id
         LEFT JOIN client_deals cd ON cd.button_press_id = bp.id
         WHERE bp.pressed_at >= $1
         GROUP BY bp.user_id, u.full_name
         ORDER BY clients DESC`,
        [from]
      ),
    ]);

    const toMap = (rows) => Object.fromEntries(rows.map((r) => [r.k, r.v]));
    res.json({
      totals: totals.rows[0],
      byType: toMap(byType.rows),
      byOutcome: toMap(byOutcome.rows),
      byReason: toMap(byReason.rows),
      bySeller: bySeller.rows,
    });
  });

  router.post("/seller-stats", async (req, res) => {
    const sellerId = req.body?.seller_id;
    if (!sellerId) return res.status(400).json({ error: "seller_id required" });

    const presses = await query(
      `SELECT * FROM button_presses WHERE user_id = $1 ORDER BY pressed_at ASC`,
      [sellerId]
    );
    const records = presses.rows;
    const dailyMap = {};
    const weeklyMap = {};
    const monthlyMap = {};
    for (const p of records) {
      const day = toLocalDate(p.pressed_at);
      const month = toLocalMonth(p.pressed_at);
      dailyMap[day] ??= { clients: 0, people: 0 };
      dailyMap[day].clients += 1;
      dailyMap[day].people += p.people_count;
      monthlyMap[month] ??= { clients: 0, people: 0 };
      monthlyMap[month].clients += 1;
      monthlyMap[month].people += p.people_count;
      const d = new Date(p.pressed_at);
      d.setUTCHours(d.getUTCHours() + 3);
      const dayOfWeek = d.getUTCDay();
      const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setUTCDate(diff);
      const weekKey = monday.toISOString().slice(0, 10);
      weeklyMap[weekKey] ??= { clients: 0, people: 0 };
      weeklyMap[weekKey].clients += 1;
      weeklyMap[weekKey].people += p.people_count;
    }

    const [shifts, breaks] = await Promise.all([
      query(`SELECT * FROM seller_shifts WHERE user_id = $1 ORDER BY started_at ASC`, [sellerId]),
      query(`SELECT * FROM seller_breaks WHERE user_id = $1 ORDER BY started_at ASC`, [sellerId]),
    ]);

    let totalWorkSeconds = 0;
    let totalBreakCount = 0;
    let totalBreakSeconds = 0;
    const dailyMap2 = {};
    for (const s of shifts.rows) {
      const start = new Date(s.started_at);
      const end = s.ended_at ? new Date(s.ended_at) : new Date();
      const shiftSec = Math.round((end.getTime() - start.getTime()) / 1000);
      const shiftBreaks = breaks.rows.filter((b) => b.shift_id === s.id);
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
      dailyMap2[day] ??= { workSeconds: 0, breakCount: 0, breakSeconds: 0 };
      dailyMap2[day].workSeconds += workSec;
      dailyMap2[day].breakCount += shiftBreaks.length;
      dailyMap2[day].breakSeconds += shiftBreakSec;
    }

    const timeDaily = Object.entries(dailyMap2)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const timeWeeklyMap = {};
    const timeMonthlyMap = {};
    for (const td of timeDaily) {
      const d = new Date(`${td.date}T12:00:00Z`);
      const dayOfWeek = d.getUTCDay();
      const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setUTCDate(diff);
      const weekKey = monday.toISOString().slice(0, 10);
      timeWeeklyMap[weekKey] ??= { workSeconds: 0, breakCount: 0, breakSeconds: 0 };
      timeWeeklyMap[weekKey].workSeconds += td.workSeconds;
      timeWeeklyMap[weekKey].breakCount += td.breakCount;
      timeWeeklyMap[weekKey].breakSeconds += td.breakSeconds;
      const monthKey = td.date.slice(0, 7);
      timeMonthlyMap[monthKey] ??= { workSeconds: 0, breakCount: 0, breakSeconds: 0 };
      timeMonthlyMap[monthKey].workSeconds += td.workSeconds;
      timeMonthlyMap[monthKey].breakCount += td.breakCount;
      timeMonthlyMap[monthKey].breakSeconds += td.breakSeconds;
    }

    res.json({
      totalClients: records.length,
      totalPeople: records.reduce((s, p) => s + p.people_count, 0),
      daily: Object.entries(dailyMap).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
      weekly: Object.entries(weeklyMap).map(([week, v]) => ({ week, ...v })).sort((a, b) => a.week.localeCompare(b.week)),
      monthly: Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v })).sort((a, b) => a.month.localeCompare(b.month)),
      timeSummary: {
        totalBreaks: totalBreakCount,
        totalBreakSeconds,
        avgBreakSeconds: totalBreakCount ? Math.round(totalBreakSeconds / totalBreakCount) : 0,
        totalWorkSeconds,
      },
      timeDaily,
      timeWeekly: Object.entries(timeWeeklyMap).map(([week, v]) => ({ week, ...v })).sort((a, b) => a.week.localeCompare(b.week)),
      timeMonthly: Object.entries(timeMonthlyMap).map(([month, v]) => ({ month, ...v })).sort((a, b) => a.month.localeCompare(b.month)),
    });
  });

  router.post("/export", async (req, res) => {
    const { date_from, date_to } = req.body || {};
    if (!date_from || !date_to) {
      return res.status(400).json({ error: "date_from and date_to required" });
    }
    const dateToEnd = `${date_to}T23:59:59.999Z`;

    const [allPresses, funnelPresses, users, breaks, shifts, consultations, deals] = await Promise.all([
      query(
        `SELECT id, user_id, sector, people_count, pressed_at
         FROM button_presses WHERE pressed_at >= $1 AND pressed_at <= $2 ORDER BY pressed_at`,
        [date_from, dateToEnd]
      ),
      query(
        `SELECT id, user_id, sector, people_count, pressed_at
         FROM button_presses WHERE pressed_at >= $1 AND pressed_at <= $2 ORDER BY pressed_at`,
        [FUNNEL_FROM, dateToEnd]
      ),
      query(`SELECT id, email, full_name, company FROM users`),
      query(
        `SELECT * FROM seller_breaks WHERE started_at >= $1 AND started_at <= $2 ORDER BY started_at`,
        [date_from, dateToEnd]
      ),
      query(
        `SELECT * FROM seller_shifts WHERE started_at >= $1 AND started_at <= $2 ORDER BY started_at`,
        [date_from, dateToEnd]
      ),
      query(
        `SELECT c.*, b.pressed_at, b.sector, b.people_count, b.user_id AS press_user_id
         FROM client_consultations c
         JOIN button_presses b ON b.id = c.button_press_id
         WHERE b.pressed_at >= $1 AND b.pressed_at <= $2
         ORDER BY c.recorded_at`,
        [FUNNEL_FROM, dateToEnd]
      ),
      query(
        `SELECT d.*, b.pressed_at, b.user_id AS press_user_id
         FROM client_deals d
         JOIN button_presses b ON b.id = d.button_press_id
         WHERE b.pressed_at >= $1 AND b.pressed_at <= $2`,
        [FUNNEL_FROM, dateToEnd]
      ),
    ]);

    const profileMap = Object.fromEntries(
      users.rows.map((u) => [u.id, { name: u.full_name || "—", email: u.email, company: u.company || "—" }])
    );

    const sellerAgg = {};
    for (const p of allPresses.rows) {
      sellerAgg[p.user_id] ??= { clients: 0, people: 0, days: new Set() };
      sellerAgg[p.user_id].clients += 1;
      sellerAgg[p.user_id].people += p.people_count;
      sellerAgg[p.user_id].days.add(p.pressed_at.slice(0, 10));
    }

    const funnelSellerAgg = {};
    const ensure = (uid) => {
      funnelSellerAgg[uid] ??= { clients: 0, consultations: 0, proposals: 0, projects: 0, refusals: 0, deals: 0 };
      return funnelSellerAgg[uid];
    };
    for (const p of funnelPresses.rows) ensure(p.user_id).clients += 1;
    const byType = {};
    const byOutcome = {};
    const byReason = {};
    for (const c of consultations.rows) {
      const uid = c.user_id || c.press_user_id;
      const agg = ensure(uid);
      agg.consultations += 1;
      if (c.outcome === "proposal_sent") agg.proposals += 1;
      if (isSale(c.outcome)) agg.projects += 1;
      if (c.outcome === "refused") agg.refusals += 1;
      byType[c.consultation_type] = (byType[c.consultation_type] ?? 0) + 1;
      byOutcome[c.outcome] = (byOutcome[c.outcome] ?? 0) + 1;
      if (c.refusal_reason) byReason[c.refusal_reason] = (byReason[c.refusal_reason] ?? 0) + 1;
    }
    for (const d of deals.rows) ensure(d.user_id || d.press_user_id).deals += 1;

    res.json({
      totalClients: allPresses.rows.length,
      totalPeople: allPresses.rows.reduce((s, p) => s + p.people_count, 0),
      sellers: Object.entries(sellerAgg).map(([uid, agg]) => ({
        user_id: uid,
        name: profileMap[uid]?.name || "—",
        email: profileMap[uid]?.email || "—",
        company: profileMap[uid]?.company || "—",
        total_clients: agg.clients,
        total_people: agg.people,
        days_active: agg.days.size,
      })).sort((a, b) => b.total_people - a.total_people),
      presses: allPresses.rows.map((p) => ({
        date: p.pressed_at,
        seller_name: profileMap[p.user_id]?.name || "—",
        seller_email: profileMap[p.user_id]?.email || "—",
        company: profileMap[p.user_id]?.company || "—",
        sector: p.sector,
        people_count: p.people_count,
      })),
      breaks: breaks.rows.map((b) => {
        const end = b.ended_at ? new Date(b.ended_at) : null;
        return {
          seller_name: profileMap[b.user_id]?.name || "—",
          seller_email: profileMap[b.user_id]?.email || "—",
          company: profileMap[b.user_id]?.company || "—",
          break_start: b.started_at,
          break_end: b.ended_at,
          break_seconds: end ? Math.round((end.getTime() - new Date(b.started_at).getTime()) / 1000) : null,
        };
      }),
      shifts: shifts.rows.map((s) => {
        const end = s.ended_at ? new Date(s.ended_at) : null;
        return {
          seller_name: profileMap[s.user_id]?.name || "—",
          seller_email: profileMap[s.user_id]?.email || "—",
          company: profileMap[s.user_id]?.company || "—",
          salon: s.salon || "",
          shift_start: s.started_at,
          shift_end: s.ended_at,
          shift_seconds: end ? Math.round((end.getTime() - new Date(s.started_at).getTime()) / 1000) : null,
        };
      }),
      funnel: {
        period_from: "2026-07-01",
        period_to: date_to,
        totals: {
          clients: funnelPresses.rows.length,
          consultations: consultations.rows.length,
          proposals: consultations.rows.filter((c) => c.outcome === "proposal_sent").length,
          projects: consultations.rows.filter((c) => isSale(c.outcome)).length,
          refusals: consultations.rows.filter((c) => c.outcome === "refused").length,
          deals: deals.rows.length,
        },
        byType,
        byOutcome,
        byReason,
        bySeller: Object.entries(funnelSellerAgg).map(([uid, agg]) => ({
          user_id: uid,
          name: profileMap[uid]?.name || "—",
          email: profileMap[uid]?.email || "—",
          company: profileMap[uid]?.company || "—",
          ...agg,
        })).sort((a, b) => b.clients - a.clients),
      },
      consultations: consultations.rows.map((c) => {
        const uid = c.user_id || c.press_user_id;
        return {
          client_date: c.pressed_at,
          seller_name: profileMap[uid]?.name || "—",
          seller_email: profileMap[uid]?.email || "—",
          company: profileMap[uid]?.company || "—",
          sector: c.sector,
          people_count: c.people_count,
          consultation_type: c.consultation_type,
          consultation_type_label: TYPE_LABELS[c.consultation_type] || c.consultation_type,
          outcome: c.outcome,
          outcome_label: OUTCOME_LABELS[c.outcome] || c.outcome,
          refusal_reason: c.refusal_reason,
          refusal_reason_label: c.refusal_reason ? REASON_LABELS[c.refusal_reason] || c.refusal_reason : null,
          recorded_at: c.recorded_at,
        };
      }),
    });
  });

  return router;
}
