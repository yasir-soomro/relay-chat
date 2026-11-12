import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotificationToasts } from "@/features/notifications/components/notification-toasts";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("notification toasts", () => {
  it("announces a new message and provides keyboard-accessible actions", () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <NotificationToasts
        onDismiss={onDismiss}
        toasts={[{ id: "message-id", conversationId: "conversation-id" }]}
      />,
    );

    expect(screen.getByText("New message in a conversation.")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Open conversation with a new message" })
        .getAttribute("href"),
    ).toBe("/conversations/conversation-id");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Dismiss new message notification",
      }),
    );
    expect(onDismiss).toHaveBeenCalledWith("message-id");
    expect(
      container.querySelector(".motion-reduce\\:transition-none"),
    ).toBeTruthy();
  });
});
