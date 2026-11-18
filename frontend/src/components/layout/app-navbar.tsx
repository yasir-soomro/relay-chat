import Link from "next/link";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { PageContainer } from "@/components/layout/page-container";
import { RelayIcon } from "@/components/ui/relay-icon";
import { SiteBrand } from "@/components/layout/site-brand";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { appNavigation } from "@/lib/site";

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
                <Link
                  className="inline-flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink transition-colors hover:bg-soft focus-visible:outline-focus"
                  href="/app/profile"
                >
                  <RelayIcon className="size-[1.125rem]" name="profile" />
                  My Profile
                </Link>
                <SignOutButton />
              </div>
            }
            ariaLabel="Application navigation"
            items={appNavigation.filter((item) => item.href !== "/app/profile")}
            renderIcon={(item) => item.icon ? <RelayIcon className="size-[1.125rem]" name={item.icon} /> : null}
          />
        </div>
      </PageContainer>
    </header>
  );
}
