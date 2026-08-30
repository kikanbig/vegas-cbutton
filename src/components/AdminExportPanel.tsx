import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ExportData {
  totalClients: number;
  totalPeople: number;
  sellers: {
    name: string;
    email: string;
    company: string;
    total_clients: number;
    total_people: number;
    days_active: number;
  }[];
  presses: {
    date: string;
    seller_name: string;
    seller_email: string;
    company: string;
    sector: number;
    people_count: number;
  }[];
  breaks: {
    seller_name: string;
    seller_email: string;
    company: string;
    break_start: string;
    break_end: string | null;
    break_seconds: number | null;
  }[];
  shifts: {
    seller_name: string;
    seller_email: string;
    company: string;
    shift_start: string;
    shift_end: string | null;
    shift_seconds: number | null;
  }[];
  funnel?: {
    period_from: string;
    period_to: string;
    totals: {
      clients: number;
      consultations: number;
      proposals: number;
      projects: number;
      refusals: number;
      deals: number;
    };
    byType: Record<string, number>;
    byOutcome: Record<string, number>;
    byReason: Record<string, number>;
    bySeller: {
      name: string;
      email: string;
      company: string;
      clients: number;
      consultations: number;
      proposals: number;
      projects: number;
      refusals: number;
      deals: number;
    }[];
  };
  consultations?: {
    client_date: string | null;
    seller_name: string;
    seller_email: string;
    company: string;
    sector: number | null;
    people_count: number | null;
    consultation_type_label: string;
    outcome_label: string;
    refusal_reason_label: string | null;
    recorded_at: string;
  }[];
}

const SECTOR_LABELS: Record<number, string> = {
  0: "1 человек",
  1: "2 человека",
  2: "3 человека",
  3: "4+ человека",
};

const formatDateTime = (value?: string | null) => value ? format(new Date(value), "dd.MM.yyyy HH:mm:ss") : "—";
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "0%");

export default function AdminExportPanel() {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!dateFrom || !dateTo) {
      toast.error("Выберите период");
      return;
    }

    setLoading(true);
    try {
      const data = await api<ExportData>("/admin/export", {
        method: "POST",
        body: JSON.stringify({
          date_from: format(dateFrom, "yyyy-MM-dd"),
          date_to: format(dateTo, "yyyy-MM-dd"),
        }),
      });

      // Build workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary
      const summaryRows = [
        ["Период", `${format(dateFrom, "dd.MM.yyyy")} — ${format(dateTo, "dd.MM.yyyy")}`],
        ["Всего клиентов", data.totalClients],
        ["Всего людей", data.totalPeople],
        ["Ср. людей/клиент", data.totalClients > 0 ? +(data.totalPeople / data.totalClients).toFixed(2) : 0],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
      summarySheet["!cols"] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, summarySheet, "Сводка");

      // Sheet 2: Sellers
      const sellerHeader = ["Имя", "Email", "Компания", "Клиентов", "Людей", "Ср./клиент", "Дней акт."];
      const sellerRows = data.sellers.map((s) => [
        s.name,
        s.email,
        s.company,
        s.total_clients,
        s.total_people,
        s.total_clients > 0 ? +(s.total_people / s.total_clients).toFixed(1) : 0,
        s.days_active,
      ]);
      const sellerSheet = XLSX.utils.aoa_to_sheet([sellerHeader, ...sellerRows]);
      sellerSheet["!cols"] = [{ wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, sellerSheet, "Продавцы");

      // Sheet 3: Raw data
      const pressHeader = ["Дата/время", "Продавец", "Email", "Компания", "Сектор", "Кол-во людей"];
      const pressRows = data.presses.map((p) => [
        format(new Date(p.date), "dd.MM.yyyy HH:mm"),
        p.seller_name,
        p.seller_email,
        p.company,
        SECTOR_LABELS[p.sector] || `Сектор ${p.sector}`,
        p.people_count,
      ]);
      const pressSheet = XLSX.utils.aoa_to_sheet([pressHeader, ...pressRows]);
      pressSheet["!cols"] = [{ wch: 18 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, pressSheet, "Все нажатия");

      // Sheet 4: Shifts
      const shiftHeader = ["Продавец", "Email", "Компания", "Начало смены", "Конец смены", "Длительность (ч:мм:сс)"];
      const shiftRows = (data.shifts || []).map((s) => {
        const sec = s.shift_seconds;
        const duration = sec != null
          ? `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`
          : "В процессе";
        return [
          s.seller_name,
          s.seller_email,
          s.company,
          format(new Date(s.shift_start), "dd.MM.yyyy HH:mm:ss"),
          s.shift_end ? format(new Date(s.shift_end), "dd.MM.yyyy HH:mm:ss") : "В процессе",
          duration,
        ];
      });
      const shiftSheet = XLSX.utils.aoa_to_sheet([shiftHeader, ...shiftRows]);
      shiftSheet["!cols"] = [{ wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, shiftSheet, "Смены");

      // Sheet 5: Breaks
      const breakHeader = ["Продавец", "Email", "Компания", "Начало перерыва", "Конец перерыва", "Длительность (мин:сек)"];
      const breakRows = (data.breaks || []).map((b) => {
        const sec = b.break_seconds;
        const duration = sec != null ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : "В процессе";
        return [
          b.seller_name,
          b.seller_email,
          b.company,
          format(new Date(b.break_start), "dd.MM.yyyy HH:mm:ss"),
          b.break_end ? format(new Date(b.break_end), "dd.MM.yyyy HH:mm:ss") : "В процессе",
          duration,
        ];
      });
      const breakSheet = XLSX.utils.aoa_to_sheet([breakHeader, ...breakRows]);
      breakSheet["!cols"] = [{ wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, breakSheet, "Перерывы");

      // Sheet 6: Sales funnel by sellers, always from 01.07.2026
      const funnel = data.funnel;
      const funnelSellerHeader = [
        "Продавец",
        "Email",
        "Компания",
        "Клиенты",
        "Консультации",
        "Проекты / встречи",
        "КП",
        "Отказы",
        "Закрытия",
        "Конв. клиент→конс.",
        "Конв. конс.→КП",
      ];
      const funnelSellerRows = (funnel?.bySeller || []).map((s) => [
        s.name,
        s.email,
        s.company,
        s.clients,
        s.consultations,
        s.projects,
        s.proposals,
        s.refusals,
        s.deals,
        pct(s.consultations, s.clients),
        pct(s.proposals + s.projects, s.consultations),
      ]);
      const funnelSellerSheet = XLSX.utils.aoa_to_sheet([
        ["Период", `01.07.2026 — ${format(dateTo, "dd.MM.yyyy")}`],
        ["Важно", "Этот лист считается по новой воронке с 1 июля; старые листы выгрузки не изменены"],
        [],
        funnelSellerHeader,
        ...funnelSellerRows,
      ]);
      funnelSellerSheet["!cols"] = [
        { wch: 22 }, { wch: 28 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 18 },
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(wb, funnelSellerSheet, "Воронка по продавцам");

      // Sheet 7: Consultation details, always from 01.07.2026
      const consultationHeader = [
        "Дата клиента",
        "Дата консультации",
        "Продавец",
        "Email",
        "Компания",
        "Сектор",
        "Людей",
        "Тип консультации",
        "Итог",
        "Причина отказа",
      ];
      const consultationRows = (data.consultations || []).map((c) => [
        formatDateTime(c.client_date),
        formatDateTime(c.recorded_at),
        c.seller_name,
        c.seller_email,
        c.company,
        c.sector != null ? (SECTOR_LABELS[c.sector] || `Сектор ${c.sector}`) : "—",
        c.people_count ?? "—",
        c.consultation_type_label,
        c.outcome_label,
        c.refusal_reason_label || "—",
      ]);
      const consultationSheet = XLSX.utils.aoa_to_sheet([
        ["Период", `01.07.2026 — ${format(dateTo, "dd.MM.yyyy")}`],
        [],
        consultationHeader,
        ...consultationRows,
      ]);
      consultationSheet["!cols"] = [
        { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 28 }, { wch: 20 },
        { wch: 15 }, { wch: 10 }, { wch: 24 }, { wch: 22 }, { wch: 24 },
      ];
      XLSX.utils.book_append_sheet(wb, consultationSheet, "Консультации");

      const filename = `PLS_export_${format(dateFrom, "dd.MM.yyyy")}-${format(dateTo, "dd.MM.yyyy")}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success("Файл скачан");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <DatePicker label="С" date={dateFrom} onSelect={setDateFrom} />
      <DatePicker label="По" date={dateTo} onSelect={setDateTo} />
      <Button
        onClick={handleExport}
        disabled={loading || !dateFrom || !dateTo}
        className="gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Выгрузить Excel
      </Button>
    </div>
  );
}

function DatePicker({ label, date, onSelect }: { label: string; date?: Date; onSelect: (d: Date | undefined) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[150px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "dd.MM.yyyy") : "Дата"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onSelect}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
