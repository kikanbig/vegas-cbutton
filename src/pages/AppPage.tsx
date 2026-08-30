import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND_NAME } from "@/lib/brand";
import { LogOut, User, Users, UserCheck, WifiOff, Wifi, Clock, Coffee, ClipboardList, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import buttonImage from "@/assets/button-quadrant.png";
import {
  addPressToQueue,
  syncQueue,
  getSavedCounts,
  saveCounts,
  loadTodayCounts,
  getPendingClients,
  type PendingClient,
} from "@/lib/offlineSync";
import { useSellerShift } from "@/hooks/useSellerShift";
import { SALONS } from "@/lib/salons";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConsultationDialog from "@/components/ConsultationDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const MULTIPLIERS = [1, 2, 3, 4];
const FREQUENCIES = [440, 523, 659, 784];

const playClickSound = (frequency: number) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  } catch {}
};

const formatDate = () =>
  new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const quadrantClips = [
  "polygon(0% 0%, 50% 0%, 50% 50%, 0% 50%)",
  "polygon(50% 0%, 100% 0%, 100% 50%, 50% 50%)",
  "polygon(0% 50%, 50% 50%, 50% 100%, 0% 100%)",
  "polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%)",
];

const AppPage = () => {
  const { profile, user, signOut } = useAuth();
  const { isShiftActive, isOnBreak, salon, loading: shiftLoading, actionLoading, toggleShift, toggleBreak, setSalon } = useSellerShift(user?.id);
  const navigate = useNavigate();
  const [pressed, setPressed] = useState<number | null>(null);
  const [clients, setClients] = useState(0);
  const [people, setPeople] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [pending, setPending] = useState<PendingClient[]>([]);
  const [consultClient, setConsultClient] = useState<PendingClient | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingRef = useRef(false);

  const refreshPending = useCallback(() => {
    setPending(getPendingClients().filter((p) => !p.has_consultation));
  }, []);

  // Load today's counts on mount
  useEffect(() => {
    if (!user) return;
    const saved = getSavedCounts();
    setClients(saved.clients);
    setPeople(saved.people);

    loadTodayCounts(user.id).then((counts) => {
      setClients(counts.clients);
      setPeople(counts.people);
      saveCounts(counts.clients, counts.people);
    });
  }, [user]);

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      doSync();
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Periodic sync every 30s when online
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) doSync();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const doSync = async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const result = await syncQueue();
      if (result.synced > 0) {
        toast.success(`Синхронизировано: ${result.synced} нажатий`);
      }
      setPendingCount(result.failed);
    } catch {
      // silent fail
    } finally {
      syncingRef.current = false;
    }
  };

  // Refresh pending list on mount and after sync
  useEffect(() => { refreshPending(); }, [refreshPending]);

  const handlePress = useCallback(
    (index: number) => {
      if (!user) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setPressed(index);
      playClickSound(FREQUENCIES[index]);

      const newClients = clients + 1;
      const newPeople = people + MULTIPLIERS[index];
      setClients(newClients);
      setPeople(newPeople);
      saveCounts(newClients, newPeople);

      const pressId = crypto.randomUUID();
      const pressedAt = new Date().toISOString();
      addPressToQueue({
        id: pressId,
        sector: index,
        people_count: MULTIPLIERS[index],
        pressed_at: pressedAt,
        user_id: user.id,
      });

      setPendingCount((c) => c + 1);
      refreshPending();

      // Immediately open consultation dialog for this client
      setConsultClient({
        button_press_id: pressId,
        user_id: user.id,
        sector: index,
        people_count: MULTIPLIERS[index],
        pressed_at: pressedAt,
        has_consultation: false,
      });

      // Try to sync immediately if online
      if (navigator.onLine) {
        setTimeout(doSync, 500);
      }

      timeoutRef.current = setTimeout(() => setPressed(null), 200);
    },
    [clients, people, user, refreshPending]
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const sellerName = profile?.full_name || user?.email || "—";

  return (
    <div className="min-h-screen bg-[#060810] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex flex-col">
          <p className="text-primary font-extrabold text-lg tracking-wide">
            {BRAND_NAME}
          </p>
          <p className="text-xs text-muted-foreground">{formatDate()}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Online indicator */}
          <div className="flex items-center gap-1">
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-destructive" />
            )}
            {pendingCount > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {pendingCount}
              </span>
            )}
          </div>
          <Sheet onOpenChange={(o) => { if (o) refreshPending(); }}>
            <SheetTrigger asChild>
              <button className="relative text-muted-foreground hover:text-foreground transition-colors" aria-label="Ожидают фиксации">
                <ClipboardList className="w-5 h-5" />
                {pending.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[10px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center font-bold">
                    {pending.length}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Ожидают фиксации консультации</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2 overflow-y-auto max-h-[calc(100vh-120px)]">
                {pending.length === 0 && (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Все клиенты обработаны
                  </p>
                )}
                {pending.map((p) => (
                  <button
                    key={p.button_press_id}
                    onClick={() => setConsultClient(p)}
                    className="w-full flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-accent/10 hover:border-accent transition-colors text-left"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">Группа {p.people_count} чел.</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.pressed_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className="text-xs text-accent font-semibold">Заполнить →</span>
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <button
            onClick={() => navigate("/account")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">{sellerName}</span>
          </button>
          <button
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Seller bar */}
      <div className="px-4 py-2 bg-muted/30 border-b border-border/30">
        <p className="text-sm font-medium text-foreground">
          Продавец: <span className="text-accent">{sellerName}</span>
        </p>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-destructive" />
          <p className="text-xs text-destructive font-medium">
            Нет соединения — данные сохраняются локально
          </p>
        </div>
      )}

      {/* Button */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        <div
          className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96"
          style={{
            borderRadius: "50%",
            overflow: "hidden",
            boxShadow: "0 18px 50px rgba(10, 163, 158, 0.22)",
          }}
        >
          <img
            src={buttonImage}
            alt="Кнопка контакта Vegas"
            className="w-full h-full object-contain select-none pointer-events-none"
            draggable={false}
          />
          {quadrantClips.map((clip, i) => (
            <button
              key={i}
              className="absolute inset-0 w-full h-full cursor-pointer"
              style={{
                clipPath: clip,
                backgroundColor:
                  pressed === i ? "rgba(255,255,255,0.25)" : "transparent",
                transform: pressed === i ? "scale(0.97)" : "scale(1)",
                transition: "background-color 0.15s ease, transform 0.15s ease",
              }}
              onClick={() => handlePress(i)}
              aria-label={`Сектор ×${MULTIPLIERS[i]}`}
            />
          ))}
          {pressed !== null && (
            <div
              className="absolute pointer-events-none rounded-full animate-ping"
              style={{
                width: 40,
                height: 40,
                backgroundColor: "rgba(255,255,255,0.3)",
                left: pressed % 2 === 0 ? "25%" : "75%",
                top: pressed < 2 ? "25%" : "75%",
                transform: "translate(-50%, -50%)",
              }}
            />
          )}
        </div>
        <p className="mt-5 text-muted-foreground text-xs text-center">
          1 человек · пара · семья · 4+
        </p>

        {/* Shift toggle */}
        <div className="mt-6 flex w-full max-w-sm flex-col items-center gap-4">
          <div className="w-full space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              Салон сегодня
            </label>
            <Select value={salon || undefined} onValueChange={setSalon} disabled={shiftLoading || actionLoading}>
              <SelectTrigger className="bg-background/80">
                <SelectValue placeholder="Выберите салон" />
              </SelectTrigger>
              <SelectContent className="max-h-72" position="item-aligned">
                {SALONS.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Clock className={`w-4 h-4 ${isShiftActive ? "text-green-500" : "text-muted-foreground"} ${actionLoading ? "animate-spin" : ""}`} />
            <Switch
              checked={isShiftActive}
              onCheckedChange={toggleShift}
              disabled={shiftLoading || actionLoading}
              className={isShiftActive
                ? "data-[state=checked]:bg-green-500"
                : "data-[state=unchecked]:bg-muted"
              }
            />
            <span className={`text-sm font-medium ${isShiftActive ? "text-green-500" : "text-muted-foreground"}`}>
              {isShiftActive ? "Смена активна" : "Смена не начата"}
            </span>
          </div>
        </div>

        {/* Break toggle — separated with large gap, only visible during active shift */}
        {isShiftActive && (
          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <Coffee className={`w-4 h-4 ${isOnBreak ? "text-destructive" : "text-green-500"} ${actionLoading ? "animate-spin" : ""}`} />
              <Switch
                checked={isOnBreak}
                onCheckedChange={toggleBreak}
                disabled={shiftLoading || actionLoading}
                className={isOnBreak
                  ? "data-[state=checked]:bg-destructive"
                  : "data-[state=unchecked]:bg-green-500"
                }
              />
              <span className={`text-sm font-medium ${isOnBreak ? "text-destructive" : "text-green-500"}`}>
                {isOnBreak ? "На перерыве" : "На экспозиции"}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Bottom stats */}
      <footer className="border-t border-border/50 bg-muted/20 px-4 py-4">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 text-accent">
              <UserCheck className="w-5 h-5" />
              <span className="text-2xl font-bold">{clients}</span>
            </div>
            <span className="text-xs text-muted-foreground">Клиентов</span>
          </div>
          <div className="w-px h-10 bg-border/50" />
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 text-accent">
              <Users className="w-5 h-5" />
              <span className="text-2xl font-bold">{people}</span>
            </div>
            <span className="text-xs text-muted-foreground">Людей</span>
          </div>
        </div>
      </footer>

      <ConsultationDialog
        open={consultClient !== null}
        buttonPressId={consultClient?.button_press_id ?? null}
        userId={consultClient?.user_id ?? null}
        peopleCount={consultClient?.people_count}
        onClose={() => setConsultClient(null)}
        onSaved={() => { refreshPending(); if (navigator.onLine) setTimeout(doSync, 300); }}
      />
    </div>
  );
};

export default AppPage;
