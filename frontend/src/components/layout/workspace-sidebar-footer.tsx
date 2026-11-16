"use client";

import { RelayIcon } from "@/components/ui/relay-icon";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ProfileAvatar } from "@/features/users/components/profile-avatar";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function WorkspaceSidebarFooter() {
  const { account, status } = useAuth();

  return (
    <div className="mt-auto pt-8">
      <aside className="rounded-2xl border border-line bg-soft p-4">
        <RelayIcon className="size-5 text-primary" name="lock" />
        <h2 className="mt-3 text-sm font-semibold text-ink">
          A little more personal.
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted">
          Connect first. Then let the conversation unfold.
        </p>
      </aside>

      <div className="mt-4 flex justify-end">
        <ThemeToggle compact />
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-2 border-t border-line pt-4">
        {account ? (
          <>
            <ProfileAvatar
              displayName={account.display_name}
              size="small"
              username={account.username}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {account.display_name}
              </p>
              <p className="truncate text-xs text-muted">@{account.username}</p>
            </div>
          </>
        ) : (
          <p className="min-w-0 flex-1 text-xs text-muted" role="status">
            {status === "loading"
              ? "Loading account…"
              : "Account details unavailable."}
          </p>
        )}
        <SignOutButton iconOnly />
      </div>
    </div>
  );
}
