import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { getSavedSalon, saveSalonLocal } from "@/lib/salons";
import { toast } from "sonner";

type ShiftState = {
  isShiftActive: boolean;
  activeShiftId: string | null;
  isOnBreak: boolean;
  activeBreakId: string | null;
  salon?: string | null;
  lastSalon?: string | null;
};

export function useSellerShift(userId: string | undefined) {
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [activeBreakId, setActiveBreakId] = useState<string | null>(null);
  const [salon, setSalonState] = useState(getSavedSalon());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const actionInProgress = useRef(false);

  const apply = (state: ShiftState) => {
    setIsShiftActive(state.isShiftActive);
    setActiveShiftId(state.activeShiftId);
    setIsOnBreak(state.isOnBreak);
    setActiveBreakId(state.activeBreakId);
    const nextSalon = state.salon || state.lastSalon || getSavedSalon();
    if (nextSalon) {
      setSalonState(nextSalon);
      saveSalonLocal(nextSalon);
    }
  };

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      try {
        apply(await api<ShiftState>("/shift"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const setSalon = useCallback(async (next: string) => {
    setSalonState(next);
    saveSalonLocal(next);
    try {
      apply(await api<ShiftState>("/shift/salon", { method: "POST", body: JSON.stringify({ salon: next }) }));
    } catch (err: any) {
      toast.error(err.message || "Не удалось сохранить салон");
    }
  }, []);

  const toggleShift = useCallback(async () => {
    if (!userId || actionInProgress.current) return;
    const chosen = salon || getSavedSalon();
    if (!isShiftActive && !chosen) {
      toast.error("Выберите салон, где вы сегодня работаете");
      return;
    }
    actionInProgress.current = true;
    setActionLoading(true);
    try {
      apply(
        await api<ShiftState>("/shift/toggle", {
          method: "POST",
          body: JSON.stringify(isShiftActive ? {} : { salon: chosen }),
        })
      );
    } catch (err: any) {
      toast.error(err.message || "Не удалось переключить смену");
    } finally {
      actionInProgress.current = false;
      setActionLoading(false);
    }
  }, [userId, salon, isShiftActive]);

  const toggleBreak = useCallback(async () => {
    if (!userId || actionInProgress.current) return;
    actionInProgress.current = true;
    setActionLoading(true);
    try {
      apply(await api<ShiftState>("/shift/break", { method: "POST" }));
    } catch (err: any) {
      toast.error(err.message || "Не удалось переключить перерыв");
    } finally {
      actionInProgress.current = false;
      setActionLoading(false);
    }
  }, [userId]);

  return { isShiftActive, isOnBreak, salon, loading, actionLoading, toggleShift, toggleBreak, setSalon };
}
