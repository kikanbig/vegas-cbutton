import { useAdminStats } from "@/hooks/useAdminStats";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, Users, UserCheck, TrendingUp, BarChart3, ArrowLeft, Activity, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import SellerDetailDialog from "@/components/SellerDetailDialog";
import AdminExportPanel from "@/components/AdminExportPanel";
import FunnelSection from "@/components/FunnelSection";

const PIE_COLORS = [
  "hsl(335, 85%, 55%)",
  "hsl(260, 45%, 45%)",
  "hsl(200, 70%, 50%)",
  "hsl(150, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(0, 70%, 55%)",
];

const AdminPage = () => {
  const { data, isLoading, error } = useAdminStats();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<"daily" | "monthly">("daily");
  const [selectedSeller, setSelectedSeller] = useState<{ id: string; name: string } | null>(null);

  // Swap manifest so "Add to Home Screen" installs the admin app
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]');
    if (link) {
      link.setAttribute('href', '/admin-manifest.json');
      return () => link.setAttribute('href', '/manifest.json');
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive text-lg font-semibold">Ошибка загрузки</p>
          <p className="text-muted-foreground text-sm">{(error as Error).message}</p>
          <button onClick={() => navigate("/app")} className="text-accent underline text-sm">
            ← Назад
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const chartData = view === "daily" ? data.daily.slice(-30) : data.monthly;

  const sellerPieData = data.sellers
    .sort((a, b) => b.total_people - a.total_people)
    .slice(0, 6)
    .map((s) => ({ name: s.name, value: s.total_people }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto max-w-7xl flex items-center justify-between px-4 md:px-8 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/app")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-accent tracking-wide italic">
              PLS Admin
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">{profile?.full_name || "Admin"}</p>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 md:px-8 py-6 space-y-8">
        {/* Export Panel */}
        <Card className="card-glass">
          <CardContent className="p-4">
            <AdminExportPanel />
          </CardContent>
        </Card>

        {/* Funnel section (Stage 1 -> Stage 2 -> Stage 3) */}
        <FunnelSection />


        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={<Users className="w-5 h-5" />} label="Пользователей" value={data.totalUsers} />
          <KPICard icon={<UserCheck className="w-5 h-5" />} label="Всего клиентов" value={data.totalClients} />
          <KPICard icon={<TrendingUp className="w-5 h-5" />} label="Всего людей" value={data.totalPeople} />
          <KPICard icon={<BarChart3 className="w-5 h-5" />} label="Ср. люд./клиент" value={data.avgPeoplePerClient} />
        </div>

        {/* Shift Status Cards */}
        <div className="grid grid-cols-3 gap-4">
          <KPICard
            icon={<Activity className="w-5 h-5" />}
            label="На смене"
            value={data.sellers.filter(s => s.is_on_shift).length}
            accent
            names={data.sellers.filter(s => s.is_on_shift).map(s => s.current_salon ? `${s.name} · ${s.current_salon}` : s.name)}
          />
          <KPICard
            icon={<Activity className="w-5 h-5" />}
            label="На перерыве"
            value={data.sellers.filter(s => s.is_on_break).length}
            variant="warning"
            names={data.sellers.filter(s => s.is_on_break).map(s => {
              if (!s.break_started_at) return s.name;
              const mins = Math.floor((Date.now() - new Date(s.break_started_at).getTime()) / 60000);
              return `${s.name} — ${mins} мин`;
            })}
          />
          <KPICard
            icon={<Activity className="w-5 h-5" />}
            label="На экспозиции"
            value={data.sellers.filter(s => s.is_on_shift && !s.is_on_break).length}
            variant="success"
            names={data.sellers.filter(s => s.is_on_shift && !s.is_on_break).map(s => s.current_salon ? `${s.name} · ${s.current_salon}` : s.name)}
          />
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main chart */}
          <Card className="lg:col-span-2 card-glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                Динамика {view === "daily" ? "по дням" : "по месяцам"}
              </CardTitle>
              <div className="flex gap-1">
                <button
                  onClick={() => setView("daily")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    view === "daily" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Дни
                </button>
                <button
                  onClick={() => setView("monthly")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    view === "monthly" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Месяцы
                </button>
              </div>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradClients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(335, 85%, 55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(335, 85%, 55%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPeople" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(260, 45%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(260, 45%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 15%, 88%)" />
                  <XAxis
                    dataKey={view === "daily" ? "date" : "month"}
                    tick={{ fontSize: 11, fill: "hsl(230, 10%, 45%)" }}
                    tickFormatter={(v) =>
                      view === "daily" ? v.slice(5) : v
                    }
                  />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(230, 10%, 45%)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(260, 30%, 12%)",
                      border: "none",
                      borderRadius: 12,
                      color: "white",
                      fontSize: 13,
                    }}
                  />
                  <Area type="monotone" dataKey="clients" stroke="hsl(335, 85%, 55%)" fill="url(#gradClients)" name="Клиенты" strokeWidth={2} />
                  <Area type="monotone" dataKey="people" stroke="hsl(260, 45%, 45%)" fill="url(#gradPeople)" name="Люди" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie chart */}
          <Card className="card-glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Топ продавцов</CardTitle>
            </CardHeader>
            <CardContent className="h-72 flex flex-col items-center justify-center">
              {sellerPieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="75%">
                    <PieChart>
                      <Pie
                        data={sellerPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                        label={false}
                      >
                        {sellerPieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                   contentStyle={{
                          background: "hsl(260, 30%, 12%)",
                          border: "none",
                          borderRadius: 12,
                          color: "#ffffff",
                          fontSize: 13,
                        }}
                        itemStyle={{ color: "#ffffff" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                    {sellerPieData.map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-foreground">{s.name.split(" ")[0]}</span>
                        <span className="text-muted-foreground">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Нет данных</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sellers Table */}
        <Card className="card-glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              Статистика продавцов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Салон</TableHead>
                  <TableHead>Компания</TableHead>
                  <TableHead className="text-right">Клиентов</TableHead>
                  <TableHead className="text-right">Людей</TableHead>
                  <TableHead className="text-right">Ср./клиент</TableHead>
                  <TableHead className="text-right">Дней акт.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sellers
                  .sort((a, b) => b.total_people - a.total_people)
                  .map((s) => (
                    <TableRow key={s.user_id} className={`cursor-pointer hover:bg-muted/50 transition-colors ${s.total_clients === 0 ? "opacity-50" : ""}`} onClick={() => setSelectedSeller({ id: s.user_id, name: s.name })}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              {s.name}
                              {s.is_admin && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">admin</Badge>}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{s.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          s.is_on_break ? "text-destructive" : s.is_on_shift ? "text-green-500" : "text-muted-foreground"
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            s.is_on_break ? "bg-destructive animate-pulse" : s.is_on_shift ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
                          }`} />
                          {s.is_on_break
                            ? `На перерыве${s.break_started_at ? ` ${Math.floor((Date.now() - new Date(s.break_started_at).getTime()) / 60000)} мин` : ""}`
                            : s.is_on_shift ? "На экспозиции" : "Не на смене"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{s.is_on_shift ? (s.current_salon || "—") : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{s.company}</TableCell>
                      <TableCell className="text-right">{s.total_clients}</TableCell>
                      <TableCell className="text-right font-semibold text-accent">{s.total_people}</TableCell>
                      <TableCell className="text-right">
                        {s.total_clients > 0 ? (s.total_people / s.total_clients).toFixed(1) : "—"}
                      </TableCell>
                      <TableCell className="text-right">{s.days_active}</TableCell>
                    </TableRow>
                  ))}
                {data.sellers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Нет данных о продавцах
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Daily bar chart */}
        <Card className="card-glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" />
              Клиенты по дням (последние 14)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.daily.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 15%, 88%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(230, 10%, 45%)" }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(230, 10%, 45%)" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(260, 30%, 12%)",
                    border: "none",
                    borderRadius: 12,
                    color: "white",
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="clients" fill="hsl(335, 85%, 55%)" radius={[6, 6, 0, 0]} name="Клиенты" />
                <Bar dataKey="people" fill="hsl(260, 45%, 45%)" radius={[6, 6, 0, 0]} name="Люди" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <SellerDetailDialog
          sellerId={selectedSeller?.id ?? null}
          sellerName={selectedSeller?.name ?? ""}
          onClose={() => setSelectedSeller(null)}
        />
      </main>
    </div>
  );
};

function KPICard({ icon, label, value, accent, variant, names }: { icon: React.ReactNode; label: string; value: number; accent?: boolean; variant?: "success" | "warning"; names?: string[] }) {
  const [open, setOpen] = useState(false);
  const colorClass = variant === "success"
    ? "text-green-500"
    : variant === "warning"
      ? "text-destructive"
      : accent
        ? "text-accent"
        : "text-muted-foreground";
  const ringClass = variant === "success"
    ? "ring-1 ring-green-500/30"
    : variant === "warning"
      ? "ring-1 ring-destructive/30"
      : accent
        ? "ring-1 ring-accent/30"
        : "";
  return (
    <Card
      className={`card-glass overflow-hidden ${ringClass} ${names ? "cursor-pointer" : ""}`}
      onClick={() => names && setOpen(!open)}
    >
      <CardContent className="p-4 flex flex-col gap-1">
        <div className={`flex items-center gap-2 ${colorClass}`}>
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {open && names && names.length > 0 && (
          <div className="mt-2 space-y-0.5 border-t border-border/50 pt-2">
            {names.map((n, i) => (
              <p key={i} className="text-xs text-muted-foreground">{n}</p>
            ))}
          </div>
        )}
        {open && names && names.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground border-t border-border/50 pt-2">Никого</p>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminPage;
