import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

type ShiftState = {
  isShiftActive: boolean;
  activeShiftId: string | null;
  isOnBreak: boolean;
  activeBreakId: string | null;
};

export function useSellerShift(userId: string | undefined) {
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [activeBreakId, setActiveBreakId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const actionInProgress = useRef(false);

  const apply = (state: ShiftState) => {
    setIsShiftActive(state.isShiftActive);
    setActiveShiftId(state.activeShiftId);
    setIsOnBreak(state.isOnBreak);
    setActiveBreakId(state.activeBreakId);
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

  const toggleShift = useCallback(async () => {
    if (!userId || actionInProgress.current) return;
    actionInProgress.current = true;
    setActionLoading(true);
    try {
      apply(await api<ShiftState>("/shift/toggle", { method: "POST" }));
    } catch (err: any) {
      toast.error(err.message || "Не удалось переключить смену");
    } finally {
      actionInProgress.current = false;
      setActionLoading(false);
    }
  }, [userId]);

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

  return { isShiftActive, isOnBreak, loading, actionLoading, toggleShift, toggleBreak };
}
