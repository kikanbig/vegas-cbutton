import { supabase } from "@/integrations/supabase/client";

interface PressRecord {
  id: string;
  sector: number;
  people_count: number;
  pressed_at: string;
  user_id: string;
}

export type ConsultationType = "express" | "deep";
export type ConsultationOutcome = "proposal_sent" | "project_offered" | "refused";
export type RefusalReason = "price" | "product" | "other";

export interface ConsultationRecord {
  id: string; // local id
  button_press_id: string;
  user_id: string;
  consultation_type: ConsultationType;
  outcome: ConsultationOutcome;
  refusal_reason: RefusalReason | null;
  recorded_at: string;
}

export interface PendingClient {
  button_press_id: string;
  user_id: string;
  sector: number;
  people_count: number;
  pressed_at: string;
  has_consultation: boolean;
}

const QUEUE_KEY = "pipelinescope_offline_queue";
const COUNTS_KEY = "pipelinescope_counts";
const COUNTS_DATE_KEY = "pipelinescope_counts_date";
const CONSULT_QUEUE_KEY = "pipelinescope_consult_queue";
const PENDING_KEY = "pipelinescope_pending_clients";

// ---------- Press queue ----------
export const getOfflineQueue = (): PressRecord[] => {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
};
const saveQueue = (q: PressRecord[]) => localStorage.setItem(QUEUE_KEY, JSON.stringify(q));

// ---------- Consultation queue ----------
export const getConsultQueue = (): ConsultationRecord[] => {
  try { return JSON.parse(localStorage.getItem(CONSULT_QUEUE_KEY) || "[]"); } catch { return []; }
};
const saveConsultQueue = (q: ConsultationRecord[]) =>
  localStorage.setItem(CONSULT_QUEUE_KEY, JSON.stringify(q));

// ---------- Pending clients (for current session) ----------
export const getPendingClients = (): PendingClient[] => {
  try {
    const raw: PendingClient[] = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
    // Keep only today
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    return raw.filter((p) => new Date(p.pressed_at) >= todayStart);
  } catch { return []; }
};
const savePending = (list: PendingClient[]) =>
  localStorage.setItem(PENDING_KEY, JSON.stringify(list));

export const addPendingClient = (c: PendingClient) => {
  const list = getPendingClients();
  list.push(c);
  savePending(list);
};

export const markConsultationDone = (button_press_id: string) => {
  const list = getPendingClients().map((p) =>
    p.button_press_id === button_press_id ? { ...p, has_consultation: true } : p
  );
  savePending(list);
};

export const removePendingClient = (button_press_id: string) => {
  savePending(getPendingClients().filter((p) => p.button_press_id !== button_press_id));
};

// ---------- Counts ----------
export const getSavedCounts = (): { clients: number; people: number } => {
  try {
    const savedDate = localStorage.getItem(COUNTS_DATE_KEY);
    const today = new Date().toDateString();
    if (savedDate !== today) {
      saveCounts(0, 0);
      return { clients: 0, people: 0 };
    }
    return JSON.parse(localStorage.getItem(COUNTS_KEY) || '{"clients":0,"people":0}');
  } catch { return { clients: 0, people: 0 }; }
};

export const saveCounts = (clients: number, people: number) => {
  localStorage.setItem(COUNTS_KEY, JSON.stringify({ clients, people }));
  localStorage.setItem(COUNTS_DATE_KEY, new Date().toDateString());
};

// ---------- Press lifecycle ----------
export const addPressToQueue = (record: PressRecord) => {
  const q = getOfflineQueue();
  q.push(record);
  saveQueue(q);
  addPendingClient({
    button_press_id: record.id,
    user_id: record.user_id,
    sector: record.sector,
    people_count: record.people_count,
    pressed_at: record.pressed_at,
    has_consultation: false,
  });
};

// ---------- Consultation lifecycle ----------
export const queueConsultation = (record: ConsultationRecord) => {
  const q = getConsultQueue();
  q.push(record);
  saveConsultQueue(q);
  markConsultationDone(record.button_press_id);
};

// ---------- Sync ----------
const syncPresses = async (): Promise<{ synced: number; failed: number }> => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  const payload = queue.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    sector: r.sector,
    people_count: r.people_count,
    pressed_at: r.pressed_at,
  }));

  const { error } = await supabase
    .from("button_presses")
    .upsert(payload, { onConflict: "id", ignoreDuplicates: true });

  if (!error) {
    saveQueue([]);
    return { synced: queue.length, failed: 0 };
  }

  // Fallback row-by-row
  let synced = 0;
  const remaining: PressRecord[] = [];
  for (const r of queue) {
    const { error: e } = await supabase
      .from("button_presses")
      .upsert(
        {
          id: r.id,
          user_id: r.user_id,
          sector: r.sector,
          people_count: r.people_count,
          pressed_at: r.pressed_at,
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
    if (!e) synced++; else remaining.push(r);
  }
  saveQueue(remaining);
  return { synced, failed: remaining.length };
};

const syncConsultations = async (): Promise<{ synced: number; failed: number }> => {
  const queue = getConsultQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  const remaining: ConsultationRecord[] = [];

  for (const r of queue) {
    const { error } = await supabase.from("client_consultations").upsert(
      {
        id: r.id,
        button_press_id: r.button_press_id,
        user_id: r.user_id,
        consultation_type: r.consultation_type,
        outcome: r.outcome,
        refusal_reason: r.refusal_reason,
        recorded_at: r.recorded_at,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
    if (!error) {
      synced++;
      // press is now safely on server, can drop from pending
      removePendingClient(r.button_press_id);
    } else {
      remaining.push(r);
    }
  }
  saveConsultQueue(remaining);
  return { synced, failed: remaining.length };
};

export const syncQueue = async (): Promise<{ synced: number; failed: number }> => {
  const presses = await syncPresses();
  // Only try consultations once corresponding presses have been synced
  const consults = await syncConsultations();
  return {
    synced: presses.synced + consults.synced,
    failed: presses.failed + consults.failed,
  };
};

export const loadTodayCounts = async (userId: string): Promise<{ clients: number; people: number }> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("button_presses")
    .select("people_count")
    .eq("user_id", userId)
    .gte("pressed_at", todayStart.toISOString());

  if (error || !data) return getSavedCounts();

  const clients = data.length;
  const people = data.reduce((sum, r) => sum + r.people_count, 0);

  const queue = getOfflineQueue().filter(
    (r) => r.user_id === userId && new Date(r.pressed_at) >= todayStart
  );

  return {
    clients: clients + queue.length,
    people: people + queue.reduce((s, r) => s + r.people_count, 0),
  };
};
