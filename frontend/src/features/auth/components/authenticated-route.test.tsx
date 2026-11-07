import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { replace } = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/app",
  useRouter: () => ({ replace }),
}));

import { AuthProvider } from "@/features/auth/providers/auth-provider";
import { AuthenticatedRoute } from "@/features/auth/components/authenticated-route";

describe("authenticated route", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "No refresh token" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
  });

  it("does not render protected content and redirects after session restoration fails", async () => {
    render(
      <AuthProvider>
        <AuthenticatedRoute>
          <p>Private workspace</p>
        </AuthenticatedRoute>
      </AuthProvider>,
    );

    expect(screen.queryByText("Private workspace")).toBeNull();
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login?next=%2Fapp");
    });
    expect(screen.queryByText("Private workspace")).toBeNull();
  });
});
