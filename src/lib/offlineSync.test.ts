import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
  api: vi.fn(),
}));

import { api } from "./api";
import {
  addPressToQueue,
  getOfflineQueue,
  getPendingClients,
  getSavedCounts,
  markConsultationDone,
  queueConsultation,
  saveCounts,
  syncQueue,
} from "./offlineSync";

describe("offlineSync", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(api).mockReset();
  });

  it("queues a press and a pending client", () => {
    addPressToQueue({
      id: "press-1",
      sector: 1,
      people_count: 2,
      pressed_at: new Date().toISOString(),
      user_id: "user-1",
    });
    expect(getOfflineQueue()).toHaveLength(1);
    expect(getPendingClients()).toEqual([
      expect.objectContaining({
        button_press_id: "press-1",
        people_count: 2,
        has_consultation: false,
      }),
    ]);
  });

  it("drops pending clients from previous days", () => {
    addPressToQueue({
      id: "old",
      sector: 0,
      people_count: 1,
      pressed_at: "2020-01-01T10:00:00.000Z",
      user_id: "user-1",
    });
    expect(getPendingClients()).toHaveLength(0);
  });

  it("records a sale consultation and marks the client done", () => {
    addPressToQueue({
      id: "press-2",
      sector: 2,
      people_count: 3,
      pressed_at: new Date().toISOString(),
      user_id: "user-1",
    });
    queueConsultation({
      id: "c-1",
      button_press_id: "press-2",
      user_id: "user-1",
      consultation_type: "express",
      outcome: "sale",
      refusal_reason: null,
      recorded_at: new Date().toISOString(),
    });
    expect(getPendingClients().find((p) => p.button_press_id === "press-2")?.has_consultation).toBe(true);
  });

  it("can mark a consultation done without queuing twice", () => {
    addPressToQueue({
      id: "press-3",
      sector: 0,
      people_count: 1,
      pressed_at: new Date().toISOString(),
      user_id: "user-1",
    });
    markConsultationDone("press-3");
    expect(getPendingClients()[0].has_consultation).toBe(true);
  });

  it("resets daily counts when the date changes", () => {
    saveCounts(4, 9);
    expect(getSavedCounts()).toEqual({ clients: 4, people: 9 });
    localStorage.setItem("pipelinescope_counts_date", "Wed Jan 01 2020");
    expect(getSavedCounts()).toEqual({ clients: 0, people: 0 });
  });

  it("syncs presses and consultations when the API succeeds", async () => {
    vi.mocked(api).mockResolvedValue({});
    addPressToQueue({
      id: "press-4",
      sector: 3,
      people_count: 4,
      pressed_at: new Date().toISOString(),
      user_id: "user-1",
    });
    queueConsultation({
      id: "c-2",
      button_press_id: "press-4",
      user_id: "user-1",
      consultation_type: "deep",
      outcome: "proposal_sent",
      refusal_reason: null,
      recorded_at: new Date().toISOString(),
    });
    const result = await syncQueue();
    expect(result).toEqual({ synced: 2, failed: 0 });
    expect(getOfflineQueue()).toHaveLength(0);
  });

  it("keeps the queue when sync fails", async () => {
    vi.mocked(api).mockRejectedValue(new Error("offline"));
    addPressToQueue({
      id: "press-5",
      sector: 0,
      people_count: 1,
      pressed_at: new Date().toISOString(),
      user_id: "user-1",
    });
    const result = await syncQueue();
    expect(result.failed).toBeGreaterThan(0);
    expect(getOfflineQueue()).toHaveLength(1);
  });
});
