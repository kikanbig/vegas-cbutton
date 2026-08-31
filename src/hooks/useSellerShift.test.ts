import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.fn();
vi.mock("@/lib/api", () => ({ api: (...args: unknown[]) => api(...args) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { useSellerShift } from "./useSellerShift";
import { LAST_SALON_KEY } from "@/lib/salons";
import { toast } from "sonner";

describe("useSellerShift", () => {
  beforeEach(() => {
    localStorage.clear();
    api.mockReset();
    vi.mocked(toast.error).mockClear();
  });

  it("restores the last salon from the API", async () => {
    api.mockResolvedValue({
      isShiftActive: false,
      activeShiftId: null,
      isOnBreak: false,
      activeBreakId: null,
      salon: null,
      lastSalon: 'ТЦ "Мост"',
    });
    const { result } = renderHook(() => useSellerShift("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.salon).toBe('ТЦ "Мост"');
    expect(localStorage.getItem(LAST_SALON_KEY)).toBe('ТЦ "Мост"');
  });

  it("does not start a shift without a salon", async () => {
    api.mockResolvedValue({
      isShiftActive: false,
      activeShiftId: null,
      isOnBreak: false,
      activeBreakId: null,
    });
    const { result } = renderHook(() => useSellerShift("user-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.toggleShift();
    });
    expect(toast.error).toHaveBeenCalledWith("Выберите салон, где вы сегодня работаете");
    expect(api).toHaveBeenCalledTimes(1);
  });

  it("sends the chosen salon when opening a shift", async () => {
    api
      .mockResolvedValueOnce({
        isShiftActive: false,
        activeShiftId: null,
        isOnBreak: false,
        activeBreakId: null,
        lastSalon: 'ТЦ "Coolman"',
      })
      .mockResolvedValueOnce({
        isShiftActive: true,
        activeShiftId: "shift-1",
        isOnBreak: false,
        activeBreakId: null,
        salon: 'ТЦ "Coolman"',
        lastSalon: 'ТЦ "Coolman"',
      });
    const { result } = renderHook(() => useSellerShift("user-1"));
    await waitFor(() => expect(result.current.salon).toBe('ТЦ "Coolman"'));
    await act(async () => {
      await result.current.toggleShift();
    });
    expect(api).toHaveBeenLastCalledWith(
      "/shift/toggle",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ salon: 'ТЦ "Coolman"' }),
      })
    );
    expect(result.current.isShiftActive).toBe(true);
  });
});
