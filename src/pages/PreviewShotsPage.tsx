import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import ConsultationDialog from "@/components/ConsultationDialog";
import FunnelSection from "@/components/FunnelSection";
import type { FunnelStats } from "@/hooks/useFunnelStats";

const MOCK: FunnelStats = {
  totals: { clients: 184, consultations: 142, proposals: 58, projects: 31, refusals: 53, deals: 22 },
  byType: { express: 87, deep: 55 },
  byOutcome: { proposal_sent: 58, project_offered: 31, refused: 53 },
  byReason: { price: 28, product: 14, other: 11 },
  bySeller: [
    { user_id: "1", name: "Иванов А.", clients: 62, consultations: 51, proposals: 22, projects: 12, refusals: 17, deals: 9 },
    { user_id: "2", name: "Петрова Е.", clients: 48, consultations: 39, proposals: 16, projects: 9, refusals: 14, deals: 7 },
    { user_id: "3", name: "Сидоров К.", clients: 41, consultations: 30, proposals: 12, projects: 6, refusals: 12, deals: 4 },
    { user_id: "4", name: "Кузнецова О.", clients: 33, consultations: 22, proposals: 8, projects: 4, refusals: 10, deals: 2 },
  ],
};

const PreviewShotsPage = () => {
  const [params] = useSearchParams();
  const view = params.get("view") || "consultation";
  const qc = useQueryClient();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    qc.setQueryData(["admin-funnel-stats"], MOCK);
  }, [qc]);

  if (view === "funnel") {
    return (
      <div className="min-h-screen bg-background p-6">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Воронка продаж — превью</h1>
        <FunnelSection />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <p className="text-muted-foreground">Диалог консультации (превью)</p>
      <ConsultationDialog
        open={open}
        buttonPressId="preview-press"
        userId="preview-user"
        peopleCount={2}
        onClose={() => setOpen(true)}
        onSaved={() => setOpen(true)}
      />
    </div>
  );
};

export default PreviewShotsPage;
