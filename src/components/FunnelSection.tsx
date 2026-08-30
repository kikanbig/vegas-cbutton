import { useFunnelStats } from "@/hooks/useFunnelStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2, Filter } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  express: "Экспресс",
  deep: "Глубинная",
};
const OUTCOME_LABELS: Record<string, string> = {
  proposal_sent: "Сформировано КП",
  project_offered: "Проект / встреча",
  refused: "Отказ клиента",
};
const REASON_LABELS: Record<string, string> = {
  price: "Не соответствует цена",
  product: "Не нравится товар",
  other: "Без указания причин",
};

const COLORS = ["hsl(335, 85%, 55%)", "hsl(260, 45%, 45%)", "hsl(200, 70%, 50%)", "hsl(150, 60%, 45%)"];

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

const FunnelSection = () => {
  const { data, isLoading, error } = useFunnelStats();

  if (isLoading) {
    return (
      <Card className="card-glass">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }
  if (error || !data) {
    return (
      <Card className="card-glass">
        <CardContent className="p-4 text-sm text-destructive">
          Ошибка загрузки воронки: {(error as Error)?.message}
        </CardContent>
      </Card>
    );
  }

  const { totals, byType, byOutcome, byReason, bySeller } = data;

  const typeData = Object.entries(byType).map(([k, v]) => ({ name: TYPE_LABELS[k] || k, value: v }));
  const outcomeData = Object.entries(byOutcome).map(([k, v]) => ({ name: OUTCOME_LABELS[k] || k, value: v }));
  const reasonData = Object.entries(byReason).map(([k, v]) => ({ name: REASON_LABELS[k] || k, value: v }));

  return (
    <div className="space-y-6">
      <Card className="card-glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="w-4 h-4 text-accent" />
            Воронка продаж
            <span className="ml-2 text-xs font-normal text-muted-foreground">с 1 июля 2026</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <FunnelStep label="Клиенты" value={totals.clients} sub="100%" />
            <FunnelStep
              label="Консультации"
              value={totals.consultations}
              sub={`${pct(totals.consultations, totals.clients)}%`}
            />
            <FunnelStep
              label="Проекты / встречи"
              value={totals.projects}
              sub={`${pct(totals.projects, totals.consultations)}%`}
            />
            <FunnelStep
              label="КП"
              value={totals.proposals}
              sub={`${pct(totals.proposals + totals.projects, totals.consultations)}%`}
            />
            <FunnelStep
              label="Отказы"
              value={totals.refusals}
              sub={`${pct(totals.refusals, totals.consultations)}%`}
              variant="warning"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="card-glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Тип консультации</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            {typeData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center pt-12">Нет данных</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label>
                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(230, 15%, 88%)", borderRadius: 12, color: "hsl(260, 40%, 16%)", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="card-glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Итог консультации</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            {outcomeData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center pt-12">Нет данных</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outcomeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 15%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(230, 10%, 45%)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(230, 10%, 45%)" }} />
                  <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(230, 15%, 88%)", borderRadius: 12, color: "hsl(260, 40%, 16%)", fontSize: 13 }} />
                  <Bar dataKey="value" fill="hsl(335, 85%, 55%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="card-glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Причины отказов</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            {reasonData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center pt-12">Нет данных</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reasonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 15%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(230, 10%, 45%)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(230, 10%, 45%)" }} />
                  <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(230, 15%, 88%)", borderRadius: 12, color: "hsl(260, 40%, 16%)", fontSize: 13 }} />
                  <Bar dataKey="value" fill="hsl(0, 70%, 55%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="card-glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Воронка по продавцам</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead className="text-right">Клиенты</TableHead>
                <TableHead className="text-right">Консульт.</TableHead>
                <TableHead className="text-right">Проекты</TableHead>
                <TableHead className="text-right">КП</TableHead>
                <TableHead className="text-right">Отказы</TableHead>
                <TableHead className="text-right">Конв. К→Конс</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bySeller.map((s) => (
                <TableRow key={s.user_id} className={s.clients === 0 ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right">{s.clients}</TableCell>
                  <TableCell className="text-right">{s.consultations}</TableCell>
                  <TableCell className="text-right">{s.projects}</TableCell>
                  <TableCell className="text-right text-accent font-semibold">{s.proposals}</TableCell>
                  <TableCell className="text-right text-destructive">{s.refusals}</TableCell>
                  <TableCell className="text-right">{pct(s.consultations, s.clients)}%</TableCell>
                </TableRow>
              ))}
              {bySeller.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Нет данных
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

function FunnelStep({ label, value, sub, variant }: { label: string; value: number; sub: string; variant?: "warning" }) {
  return (
    <div className={`rounded-xl border p-3 ${variant === "warning" ? "border-destructive/30" : "border-border"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${variant === "warning" ? "text-destructive" : "text-foreground"}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

export default FunnelSection;
