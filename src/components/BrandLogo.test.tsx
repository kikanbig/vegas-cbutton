import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BrandLogo from "./BrandLogo";

describe("BrandLogo", () => {
  it("shows the Vegas wordmark, not a text label", () => {
    render(<BrandLogo />);
    const image = screen.getByAltText("Vegas");
    expect(image).toBeInTheDocument();
    expect(image.tagName).toBe("IMG");
    expect(screen.queryByText("Vegas")).not.toBeInTheDocument();
  });

  it("can be clicked when used as a home link", async () => {
    const onClick = vi.fn();
    render(<BrandLogo onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
