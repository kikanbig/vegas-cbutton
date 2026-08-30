import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSellerStats } from "@/hooks/useSellerStats";
import { Loader2, TrendingUp, Users, Coffee, Timer, Clock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface SellerDetailDialogProps {
  sellerId: string | null;
  sellerName: string;
  onClose: () => void;
}

function formatSeconds(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}ч ${m}м ${String(s).padStart(2, "0")}с`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const SellerDetailDialog = ({ sellerId, sellerName, onClose }: SellerDetailDialogProps) => {
  const { data, isLoading } = useSellerStats(sellerId);

  return (
    <Dialog open={!!sellerId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            {sellerName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : !data ? (
          <p className="text-muted-foreground text-center py-8">Нет данных</p>
        ) : (
          <div className="space-y-6">
            {/* Client summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Всего клиентов
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{data.totalClients}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Всего людей
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{data.totalPeople}</p>
              </div>
            </div>

            {/* Time summary */}
            {data.timeSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-green-500/10 p-3">
                  <p className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Рабочее время
                  </p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{formatSeconds(data.timeSummary.totalWorkSeconds)}</p>
                </div>
                <div className="rounded-xl bg-destructive/10 p-3">
                  <p className="text-[10px] text-destructive flex items-center gap-1">
                    <Coffee className="w-3 h-3" /> Перерывов
                  </p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{data.timeSummary.totalBreaks}</p>
                </div>
                <div className="rounded-xl bg-destructive/10 p-3">
                  <p className="text-[10px] text-destructive flex items-center gap-1">
                    <Timer className="w-3 h-3" /> Время перерывов
                  </p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{formatSeconds(data.timeSummary.totalBreakSeconds)}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Timer className="w-3 h-3" /> Ср. перерыв
                  </p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{formatSeconds(data.timeSummary.avgBreakSeconds)}</p>
                </div>
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="daily">
              <TabsList className="w-full">
                <TabsTrigger value="daily" className="flex-1">По дням</TabsTrigger>
                <TabsTrigger value="weekly" className="flex-1">По неделям</TabsTrigger>
                <TabsTrigger value="monthly" className="flex-1">По месяцам</TabsTrigger>
                <TabsTrigger value="time" className="flex-1">Время</TabsTrigger>
              </TabsList>

              <TabsContent value="daily">
                <ChartView
                  data={data.daily.slice(-30)}
                  xKey="date"
                  formatX={(v) => v.slice(5)}
                  emptyText="Нет данных по дням"
                />
              </TabsContent>

              <TabsContent value="weekly">
                <ChartView
                  data={data.weekly.slice(-12)}
                  xKey="week"
                  formatX={(v) => v.slice(5)}
                  emptyText="Нет данных по неделям"
                />
              </TabsContent>

              <TabsContent value="monthly">
                <ChartView
                  data={data.monthly}
                  xKey="month"
                  formatX={(v) => v}
                  emptyText="Нет данных по месяцам"
                />
              </TabsContent>

              <TabsContent value="time">
                <Tabs defaultValue="time-daily">
                  <TabsList className="w-full mb-2">
                    <TabsTrigger value="time-daily" className="flex-1 text-xs">По дням</TabsTrigger>
                    <TabsTrigger value="time-weekly" className="flex-1 text-xs">По неделям</TabsTrigger>
                    <TabsTrigger value="time-monthly" className="flex-1 text-xs">По месяцам</TabsTrigger>
                  </TabsList>
                  <TabsContent value="time-daily">
                    <TimeChartView data={data.timeDaily?.slice(-30) ?? []} xKey="date" formatX={(v) => v.slice(5)} />
                  </TabsContent>
                  <TabsContent value="time-weekly">
                    <TimeChartView data={data.timeWeekly?.slice(-12) ?? []} xKey="week" formatX={(v) => v.slice(5)} />
                  </TabsContent>
                  <TabsContent value="time-monthly">
                    <TimeChartView data={data.timeMonthly ?? []} xKey="month" formatX={(v) => v} />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

function ChartView({
  data,
  xKey,
  formatX,
  emptyText,
}: {
  data: any[];
  xKey: string;
  formatX: (v: string) => string;
  emptyText: string;
}) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-8">{emptyText}</p>;
  }

  return (
    <div className="h-64 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 15%, 88%)" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "hsl(230, 10%, 45%)" }}
            tickFormatter={formatX}
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
          <Bar dataKey="clients" fill="hsl(335, 85%, 55%)" radius={[6, 6, 0, 0]} name="Клиенты" />
          <Bar dataKey="people" fill="hsl(260, 45%, 45%)" radius={[6, 6, 0, 0]} name="Люди" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TimeChartView({ data, xKey = "date", formatX = (v: string) => v.slice(5) }: { data: any[]; xKey?: string; formatX?: (v: string) => string }) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-8">Нет данных по времени</p>;
  }

  const chartData = data.map((d) => ({
    label: formatX(d[xKey]),
    "Работа (мин)": +(d.workSeconds / 60).toFixed(1),
    "Перерывы (мин)": +(d.breakSeconds / 60).toFixed(1),
  }));

  return (
    <div className="h-64 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 15%, 88%)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(230, 10%, 45%)" }} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(230, 10%, 45%)" }} unit=" мин" />
          <Tooltip
            contentStyle={{
              background: "hsl(260, 30%, 12%)",
              border: "none",
              borderRadius: 12,
              color: "white",
              fontSize: 13,
            }}
            formatter={(value: number, name: string) => {
              const m = Math.floor(value);
              const s = Math.round((value - m) * 60);
              return [`${m}:${String(s).padStart(2, "0")}`, name];
            }}
          />
          <Legend />
          <Bar dataKey="Работа (мин)" fill="hsl(150, 60%, 45%)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="Перерывы (мин)" fill="hsl(0, 70%, 55%)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SellerDetailDialog;
