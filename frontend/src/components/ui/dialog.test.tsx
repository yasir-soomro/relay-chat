import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "@/components/ui/dialog";

describe("Dialog", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = true;
      },
    });
  });

  it("uses a labelled modal and closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <Dialog
        description="Review this action before continuing."
        onClose={onClose}
        open
        title="Confirm action"
      >
        <p>Dialog content</p>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Confirm action" });
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
    fireEvent(dialog, new Event("cancel", { cancelable: true }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
