import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, isLoading: false, applySession: vi.fn() }),
}));
vi.mock("@/lib/api", () => ({
  api: vi.fn().mockResolvedValue({ allowedEmailDomain: null }),
}));

import AuthPage from "./AuthPage";

describe("AuthPage", () => {
  it("asks for email and password on login", () => {
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Пароль")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
    expect(screen.queryByText(/отправим код для входа/i)).not.toBeInTheDocument();
  });

  it("asks to confirm the password on register", () => {
    render(
      <MemoryRouter initialEntries={["/auth?mode=register"]}>
        <AuthPage />
      </MemoryRouter>
    );
    expect(screen.getByLabelText("Повторите пароль")).toBeInTheDocument();
    expect(screen.getByText(/почту подтверждаем один раз/i)).toBeInTheDocument();
  });
});
