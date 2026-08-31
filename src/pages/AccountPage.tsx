import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import BrandLogo from "@/components/BrandLogo";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, User, UserCheck, Users, CalendarDays, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MonthStats {
  month: string; // "2026-02"
  label: string; // "Февраль 2026"
  clients: number;
  people: number;
  days: { date: string; label: string; clients: number; people: number }[];
}

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const AccountPage = () => {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [company, setCompany] = useState(profile?.company ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<MonthStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // Load all history
  useEffect(() => {
    if (!user) return;
    loadStats(user.id);
  }, [user]);

  const loadStats = async (userId: string) => {
    setLoadingStats(true);
    try {
      const data = await api<{ pressed_at: string; people_count: number }[]>("/presses");

      // Group by month, then by day
      const monthsMap = new Map<string, Map<string, { clients: number; people: number }>>();

      for (const row of data || []) {
        const d = new Date(row.pressed_at);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const dayKey = d.toISOString().slice(0, 10);

        if (!monthsMap.has(monthKey)) monthsMap.set(monthKey, new Map());
        const daysMap = monthsMap.get(monthKey)!;

        if (!daysMap.has(dayKey)) daysMap.set(dayKey, { clients: 0, people: 0 });
        const dayStats = daysMap.get(dayKey)!;
        dayStats.clients += 1;
        dayStats.people += row.people_count;
      }

      const result: MonthStats[] = [];
      for (const [monthKey, daysMap] of monthsMap) {
        const [year, mon] = monthKey.split("-").map(Number);
        const days = Array.from(daysMap.entries())
          .map(([date, s]) => ({
            date,
            label: new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", weekday: "short" }),
            ...s,
          }))
          .sort((a, b) => b.date.localeCompare(a.date));

        result.push({
          month: monthKey,
          label: `${MONTH_NAMES[mon - 1]} ${year}`,
          clients: days.reduce((s, d) => s + d.clients, 0),
          people: days.reduce((s, d) => s + d.people, 0),
          days,
        });
      }

      setStats(result);

      // Auto-expand current month
      const now = new Date();
      const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      if (result.some((m) => m.month === currentKey)) {
        setExpandedMonth(currentKey);
      }
    } catch (e) {
      // Stats load error suppressed
    } finally {
      setLoadingStats(false);
    }
  };


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await api("/me", {
        method: "PATCH",
        body: JSON.stringify({ full_name: fullName, company, phone }),
      });
      await refreshProfile();
      toast.success("Профиль обновлён");
    } catch (err: any) {
      toast.error(err.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const totalClients = stats.reduce((s, m) => s + m.clients, 0);
  const totalPeople = stats.reduce((s, m) => s + m.people, 0);

  return (
    <main className="min-h-screen bg-background">
      {/* Simple header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center px-4 h-14">
          <button onClick={() => navigate("/app")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Назад</span>
          </button>
          <div className="flex-1 flex justify-center">
            <BrandLogo imgClassName="h-8" />
          </div>
          <div className="w-16" />
        </div>
      </header>

      <div className="pt-20 pb-16 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile section */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
              <User className="w-7 h-7 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">Личный кабинет</h1>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="card-glass p-6 space-y-5">
            <h2 className="text-lg font-semibold text-primary">Данные профиля</h2>
            <div className="space-y-2">
              <Label htmlFor="fullName">Имя и фамилия</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Компания</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8 font-semibold" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Сохранить
            </Button>
          </form>

          {/* Total stats */}
          <div className="card-glass p-6 space-y-4">
            <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-accent" />
              Статистика за всё время
            </h2>
            <div className="flex items-center justify-around">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 text-accent">
                  <UserCheck className="w-5 h-5" />
                  <span className="text-2xl font-bold">{totalClients}</span>
                </div>
                <span className="text-xs text-muted-foreground">Клиентов</span>
              </div>
              <div className="w-px h-10 bg-border/50" />
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 text-accent">
                  <Users className="w-5 h-5" />
                  <span className="text-2xl font-bold">{totalPeople}</span>
                </div>
                <span className="text-xs text-muted-foreground">Людей</span>
              </div>
            </div>
          </div>

          {/* Monthly breakdown */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-primary px-1">По месяцам</h2>

            {loadingStats ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : stats.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Пока нет данных. Начните использовать кнопку!
              </p>
            ) : (
              stats.map((month) => (
                <div key={month.month} className="card-glass overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedMonth(expandedMonth === month.month ? null : month.month)}
                  >
                    <span className="font-semibold text-primary">{month.label}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        <span className="text-accent font-bold">{month.clients}</span> кл. · <span className="text-accent font-bold">{month.people}</span> чел.
                      </span>
                      {expandedMonth === month.month ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {expandedMonth === month.month && (
                    <div className="border-t border-border/30">
                      {month.days.map((day) => (
                        <div
                          key={day.date}
                          className="flex items-center justify-between px-4 py-3 border-b border-border/20 last:border-b-0"
                        >
                          <span className="text-sm text-muted-foreground">{day.label}</span>
                          <div className="flex items-center gap-3 text-sm">
                            <span>
                              <UserCheck className="w-3.5 h-3.5 inline mr-1 text-accent" />
                              {day.clients}
                            </span>
                            <span>
                              <Users className="w-3.5 h-3.5 inline mr-1 text-accent" />
                              {day.people}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </main>
  );
};

export default AccountPage;
