import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("exposes a disabled busy state while loading", () => {
    render(
      <Button loading type="submit">
        Saving
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Saving" });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.querySelector(".ui-spinner")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });
});
