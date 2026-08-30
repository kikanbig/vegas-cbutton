import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Search, FileText, ShoppingBag, XOctagon, BadgeDollarSign, PackageX, HelpCircle, ArrowLeft } from "lucide-react";
import {
  queueConsultation,
  type ConsultationType,
  type ConsultationOutcome,
  type RefusalReason,
} from "@/lib/offlineSync";
import { toast } from "sonner";

interface Props {
  open: boolean;
  buttonPressId: string | null;
  userId: string | null;
  peopleCount?: number;
  onClose: () => void;
  onSaved?: () => void;
}

type Step = "type" | "outcome" | "reason";

const ConsultationDialog = ({ open, buttonPressId, userId, peopleCount, onClose, onSaved }: Props) => {
  const [step, setStep] = useState<Step>("type");
  const [type, setType] = useState<ConsultationType | null>(null);
  const [outcome, setOutcome] = useState<ConsultationOutcome | null>(null);

  const reset = () => {
    setStep("type");
    setType(null);
    setOutcome(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const saveAndClose = (
    finalType: ConsultationType,
    finalOutcome: ConsultationOutcome,
    reason: RefusalReason | null
  ) => {
    if (!buttonPressId || !userId) return;
    queueConsultation({
      id: crypto.randomUUID(),
      button_press_id: buttonPressId,
      user_id: userId,
      consultation_type: finalType,
      outcome: finalOutcome,
      refusal_reason: reason,
      recorded_at: new Date().toISOString(),
    });
    toast.success("✅ Консультация записана", { duration: 1500 });
    reset();
    onSaved?.();
    onClose();
  };

  const handleType = (t: ConsultationType) => {
    setType(t);
    setStep("outcome");
  };

  const handleOutcome = (o: ConsultationOutcome) => {
    if (!type) return;
    if (o === "refused") {
      setOutcome(o);
      setStep("reason");
    } else {
      saveAndClose(type, o, null);
    }
  };

  const handleReason = (r: RefusalReason) => {
    if (!type || !outcome) return;
    saveAndClose(type, outcome, r);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "type" && "Тип консультации"}
            {step === "outcome" && "Итог консультации"}
            {step === "reason" && "Причина отказа"}
          </DialogTitle>
          <DialogDescription>
            {peopleCount ? `Клиент: группа ${peopleCount} чел.` : "Зафиксируйте этап воронки"}
          </DialogDescription>
        </DialogHeader>

        {step === "type" && (
          <div className="grid grid-cols-1 gap-3">
            <BigBtn icon={<Zap />} label="Экспресс-консультация" onClick={() => handleType("express")} />
            <BigBtn icon={<Search />} label="Глубинная проработка" onClick={() => handleType("deep")} />
            <Button variant="ghost" onClick={handleClose} className="mt-1">Позже</Button>
          </div>
        )}

        {step === "outcome" && (
          <div className="grid grid-cols-1 gap-3">
            <Button variant="ghost" size="sm" onClick={() => setStep("type")} className="self-start -mt-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Назад
            </Button>
            <BigBtn
              icon={<ShoppingBag />}
              label="Продажа"
              hint="гость купил"
              onClick={() => handleOutcome("sale")}
            />
            <BigBtn
              icon={<FileText />}
              label="Сформировано КП"
              hint="цена, условия, сроки"
              onClick={() => handleOutcome("proposal_sent")}
            />
            <BigBtn
              icon={<XOctagon />}
              variant="destructive"
              label="Отказ клиента"
              onClick={() => handleOutcome("refused")}
            />
          </div>
        )}

        {step === "reason" && (
          <div className="grid grid-cols-1 gap-3">
            <Button variant="ghost" size="sm" onClick={() => setStep("outcome")} className="self-start -mt-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Назад
            </Button>
            <BigBtn icon={<BadgeDollarSign />} label="Не соответствует цена" onClick={() => handleReason("price")} />
            <BigBtn icon={<PackageX />} label="Не нравится товар" onClick={() => handleReason("product")} />
            <BigBtn icon={<HelpCircle />} label="Без указания причин" onClick={() => handleReason("other")} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

function BigBtn({
  icon,
  label,
  hint,
  onClick,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  variant?: "default" | "destructive";
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition-colors ${
        variant === "destructive"
          ? "border-destructive/30 hover:bg-destructive/10 text-destructive"
          : "border-border hover:bg-accent/10 hover:border-accent"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex flex-col">
        <span className="font-semibold">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}

export default ConsultationDialog;
