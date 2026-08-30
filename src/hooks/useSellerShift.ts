import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useSellerShift(userId: string | undefined) {
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [activeBreakId, setActiveBreakId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const actionInProgress = useRef(false);

  // Load current state on mount — always sync from DB
  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoading(true);

      // Check for active shift
      const { data: shift } = await supabase
        .from("seller_shifts")
        .select("id")
        .eq("user_id", userId)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (shift) {
        setIsShiftActive(true);
        setActiveShiftId(shift.id);

        // Check for active break within this shift
        const { data: brk } = await supabase
          .from("seller_breaks")
          .select("id")
          .eq("shift_id", shift.id)
          .is("ended_at", null)
          .limit(1)
          .maybeSingle();

        if (brk) {
          setIsOnBreak(true);
          setActiveBreakId(brk.id);
        } else {
          setIsOnBreak(false);
          setActiveBreakId(null);
        }
      } else {
        setIsShiftActive(false);
        setActiveShiftId(null);
        setIsOnBreak(false);
        setActiveBreakId(null);
      }

      setLoading(false);
    };

    load();
  }, [userId]);

  const toggleShift = useCallback(async () => {
    if (!userId || actionInProgress.current) return;
    actionInProgress.current = true;
    setActionLoading(true);

    try {
      if (isShiftActive && activeShiftId) {
        // End ALL open breaks for this user (not just the one in state)
        await supabase
          .from("seller_breaks")
          .update({ ended_at: new Date().toISOString() })
          .eq("user_id", userId)
          .is("ended_at", null);
        setIsOnBreak(false);
        setActiveBreakId(null);

        // End shift
        const { error } = await supabase
          .from("seller_shifts")
          .update({ ended_at: new Date().toISOString() })
          .eq("id", activeShiftId);

        if (!error) {
          setIsShiftActive(false);
          setActiveShiftId(null);
        }
      } else {
        // Before starting new shift, re-check DB for any open shift
        const { data: existing } = await supabase
          .from("seller_shifts")
          .select("id")
          .eq("user_id", userId)
          .is("ended_at", null)
          .limit(1)
          .maybeSingle();

        if (existing) {
          // Sync state — there's already an open shift
          setIsShiftActive(true);
          setActiveShiftId(existing.id);
          toast.info("У вас уже есть активная смена");
          return;
        }

        // Start new shift (DB trigger auto-closes any stale ones)
        const { data, error } = await supabase
          .from("seller_shifts")
          .insert({ user_id: userId, started_at: new Date().toISOString() })
          .select("id")
          .single();

        if (!error && data) {
          setIsShiftActive(true);
          setActiveShiftId(data.id);
        }
      }
    } finally {
      actionInProgress.current = false;
      setActionLoading(false);
    }
  }, [userId, isShiftActive, activeShiftId, isOnBreak, activeBreakId]);

  const toggleBreak = useCallback(async () => {
    if (!userId || !activeShiftId || actionInProgress.current) return;
    actionInProgress.current = true;
    setActionLoading(true);

    try {
      if (isOnBreak && activeBreakId) {
        // End break
        const { error } = await supabase
          .from("seller_breaks")
          .update({ ended_at: new Date().toISOString() })
          .eq("id", activeBreakId);

        if (!error) {
          setIsOnBreak(false);
          setActiveBreakId(null);
        }
      } else {
        // Re-check DB for any open break before creating
        const { data: existing } = await supabase
          .from("seller_breaks")
          .select("id")
          .eq("user_id", userId)
          .is("ended_at", null)
          .limit(1)
          .maybeSingle();

        if (existing) {
          setIsOnBreak(true);
          setActiveBreakId(existing.id);
          toast.info("У вас уже есть активный перерыв");
          return;
        }

        // Start break (DB trigger auto-closes any stale ones)
        const { data, error } = await supabase
          .from("seller_breaks")
          .insert({
            shift_id: activeShiftId,
            user_id: userId,
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (!error && data) {
          setIsOnBreak(true);
          setActiveBreakId(data.id);
        }
      }
    } finally {
      actionInProgress.current = false;
      setActionLoading(false);
    }
  }, [userId, activeShiftId, isOnBreak, activeBreakId]);

  return { isShiftActive, isOnBreak, loading, actionLoading, toggleShift, toggleBreak };
}
