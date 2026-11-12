import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotificationInboxPage } from "@/features/notifications/components/notification-inbox-page";
import {
  NotificationContext,
  type NotificationContextValue,
} from "@/features/notifications/providers/notifications-provider";
import { ConversationListItem } from "@/features/conversations/components/conversation-list-item";
import { NavigationLinks } from "@/components/layout/navigation-links";

vi.mock("next/navigation", () => ({
  usePathname: () => "/conversations",
}));

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

const notificationValue: NotificationContextValue = {
  items: [
    {
      conversationId: "conversation-id",
      unreadCount: 2,
    },
  ],
  unreadCount: 2,
  isLoading: false,
  error: "",
  toasts: [],
  retry: vi.fn(),
  dismissToast: vi.fn(),
};

const entry = {
  conversation: {
    id: "conversation-id",
    user_low_id: "current-user",
    user_high_id: "other-user",
    created_at: "2026-11-09T09:00:00Z",
  },
  participantId: "other-user",
  participant: {
    id: "other-user",
    username: "relay_friend",
    display_name: "Relay Friend",
    bio: null,
  },
};

describe("notification UI", () => {
  it("shows unread conversation notifications without exposing message content", () => {
    render(
      <NotificationContext.Provider value={notificationValue}>
        <NotificationInboxPage />
      </NotificationContext.Provider>,
    );

    expect(screen.getByRole("heading", { name: "Notifications" })).toBeTruthy();
    expect(
      screen.getByRole("link", {
        name: "2 unread messages. Open conversation.",
      }),
    ).toBeTruthy();
    expect(screen.queryByText(/private message/i)).toBeNull();
  });

  it("shows empty and error states", () => {
    const { rerender } = render(
      <NotificationContext.Provider
        value={{ ...notificationValue, items: [], unreadCount: 0 }}
      >
        <NotificationInboxPage />
      </NotificationContext.Provider>,
    );
    expect(screen.getByText("You’re all caught up")).toBeTruthy();

    rerender(
      <NotificationContext.Provider
        value={{
          ...notificationValue,
          isLoading: false,
          error: "History unavailable",
        }}
      >
        <NotificationInboxPage />
      </NotificationContext.Provider>,
    );
    expect(screen.getByRole("alert").textContent).toBe("History unavailable");
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("shows unread badges in the inbox and navigation", () => {
    render(
      <NotificationContext.Provider value={notificationValue}>
        <ul>
          <ConversationListItem entry={entry} />
        </ul>
        <nav aria-label="Application navigation">
          <NavigationLinks
            items={[
              { href: "/conversations", label: "Conversations" },
              { href: "/notifications", label: "Notifications" },
            ]}
            direction="vertical"
          />
        </nav>
      </NotificationContext.Provider>,
    );

    expect(
      screen.getByRole("link", {
        name: "Open conversation with Relay Friend, 2 unread messages",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", {
        name: "Notifications, 2 unread messages",
      }),
    ).toBeTruthy();
  });
});
