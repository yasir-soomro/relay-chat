"use client";

import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { PageContainer } from "@/components/layout/page-container";
import { SiteBrand } from "@/components/layout/site-brand";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WorkspaceNavigation } from "@/components/layout/workspace-navigation";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function AppNavbar() {
  const { account } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur lg:hidden">
      <PageContainer className="flex min-h-16 items-center justify-between gap-2 py-2 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
        <SiteBrand compact />

        <div className="flex min-w-0 shrink-0 items-center gap-2">
          {account ? (
            <span
              aria-label={`${account.display_name} avatar`}
              className="grid size-9 place-items-center rounded-full border border-line bg-secondary text-xs font-semibold text-secondary-foreground"
              role="img"
            >
              {account.display_name.trim().slice(0, 2).toUpperCase()}
            </span>
          ) : null}
          <MobileNavigation
            actions={
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
                  <span className="text-sm font-medium text-muted">Appearance</span>
                  <ThemeToggle compact />
                </div>
                <SignOutButton />
              </div>
            }
            ariaLabel="Application navigation"
            navigation={<WorkspaceNavigation />}
          />
        </div>
      </PageContainer>
    </header>
  );
}
