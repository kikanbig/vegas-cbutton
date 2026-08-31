import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { queueConsultation } = vi.hoisted(() => ({ queueConsultation: vi.fn() }));

vi.mock("@/lib/offlineSync", async () => {
  const actual = await vi.importActual<typeof import("@/lib/offlineSync")>("@/lib/offlineSync");
  return { ...actual, queueConsultation };
});
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ConsultationDialog from "./ConsultationDialog";

describe("ConsultationDialog", () => {
  beforeEach(() => {
    queueConsultation.mockClear();
  });

  it("replaces project/meeting with sale", () => {
    render(
      <ConsultationDialog
        open
        buttonPressId="press-1"
        userId="user-1"
        peopleCount={2}
        onClose={() => {}}
      />
    );
    fireEvent.click(screen.getByText("Экспресс-консультация"));
    expect(screen.getByText("Продажа")).toBeInTheDocument();
    expect(screen.queryByText(/проект/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/встреч/i)).not.toBeInTheDocument();
  });

  it("saves a sale after an express consultation", () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(
      <ConsultationDialog
        open
        buttonPressId="press-2"
        userId="user-1"
        peopleCount={1}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
    fireEvent.click(screen.getByText("Экспресс-консультация"));
    fireEvent.click(screen.getByText("Продажа"));
    expect(queueConsultation).toHaveBeenCalledWith(
      expect.objectContaining({
        button_press_id: "press-2",
        consultation_type: "express",
        outcome: "sale",
        refusal_reason: null,
      })
    );
    expect(onSaved).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("asks for a reason when the guest refuses", () => {
    render(
      <ConsultationDialog open buttonPressId="press-3" userId="user-1" onClose={() => {}} />
    );
    fireEvent.click(screen.getByText("Глубинная проработка"));
    fireEvent.click(screen.getByText("Отказ клиента"));
    expect(screen.getByText("Причина отказа")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Не соответствует цена"));
    expect(queueConsultation).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "refused",
        refusal_reason: "price",
        consultation_type: "deep",
      })
    );
  });
});
