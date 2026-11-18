import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceNavigation } from "@/components/layout/workspace-navigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/discover",
}));

vi.mock("@/features/connections/providers/connections-provider", () => ({
  useConnections: () => ({
    incoming: [{ id: "request-1" }, { id: "request-2" }, { id: "request-3" }],
    isLoading: false,
    error: "",
  }),
}));

vi.mock("@/features/notifications/providers/notifications-provider", () => ({
  useNotifications: () => ({ unreadCount: 2 }),
}));

describe("WorkspaceNavigation", () => {
  it("shows real request and unread-message counts on the related routes", () => {
    render(<WorkspaceNavigation />);

    expect(
      screen.getByRole("link", { name: "Requests, 3 pending requests" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "SpaceHub, 2 unread messages" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Discover people" }).getAttribute(
        "aria-current",
      ),
    ).toBe("page");
    expect(screen.queryByRole("link", { name: "Overview" })).toBeNull();
  });
});
