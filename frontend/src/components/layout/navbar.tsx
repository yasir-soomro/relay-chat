"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { PageContainer } from "@/components/layout/page-container";
import { AuthNavbar } from "@/components/layout/auth-navbar";
import { SiteBrand } from "@/components/layout/site-brand";
import { RelayIcon } from "@/components/ui/relay-icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { siteNavigation } from "@/lib/site";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { SignOutButton } from "@/components/layout/sign-out-button";

const publicPageNavigation = siteNavigation.filter(
  (item) => item.href !== "/login" && item.href !== "/register",
);
const signInItem = siteNavigation.find((item) => item.href === "/login");
const createAccountItem = siteNavigation.find(
  (item) => item.href === "/register",
);

export function Navbar() {
  const pathname = usePathname();
  const { account, status } = useAuth();

  if (pathname === "/register" || pathname === "/login") {
    return <AuthNavbar mode={pathname === "/register" ? "register" : "login"} />;
  }

  if (status === "authenticated" && account) {
    return (
      <header className="auth-state-navbar relative z-20 border-b border-line/70 bg-canvas/90 backdrop-blur">
        <PageContainer className="flex min-h-16 min-w-0 items-center gap-2 py-2 sm:gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-5">
          <div className="shrink-0">
            <SiteBrand />
          </div>
          <nav aria-label="Main navigation" className="ml-auto hidden xl:ml-0 xl:block xl:justify-self-center">
            <ul className="flex items-center gap-1">
              {publicPageNavigation.map((item) => (
                <li key={item.href}>
                  <Link
                    aria-current={item.href === pathname ? "page" : undefined}
                    className={`group inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-[background-color,color] duration-150 focus-visible:outline-focus ${item.href === pathname ? "bg-soft text-primary" : "text-muted hover:bg-soft hover:text-ink"}`}
                    href={item.href}
                  >
                    {item.icon ? <RelayIcon className="size-4 transition-transform group-hover:scale-105" name={item.icon} /> : null}
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2 xl:ml-0 xl:justify-self-end">
            <Link aria-current={pathname === "/app" ? "page" : undefined} className="hidden min-h-10 items-center justify-center gap-2 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-ink transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus xl:inline-flex" href="/app"><RelayIcon className="size-4" name="spacehub" />SpaceHub</Link>
            <div className="flex shrink-0 items-center gap-2 xl:hidden">
              <span aria-label={`${account.display_name} avatar`} className="grid size-9 place-items-center rounded-full border border-line bg-secondary text-xs font-semibold text-secondary-foreground" role="img">
                {account.display_name.trim().slice(0, 2).toUpperCase()}
              </span>
              <MobileNavigation
                actions={
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
                      <span className="text-sm font-medium text-muted">Appearance</span>
                      <ThemeToggle compact />
                    </div>
                    <Link className="inline-flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink transition-colors hover:bg-soft focus-visible:outline-focus" href="/app/profile">
                      <RelayIcon className="size-[1.125rem]" name="profile" />
                      My Profile
                    </Link>
                    <SignOutButton />
                  </div>
                }
                ariaLabel="Main navigation"
                desktopMinWidth={1280}
                items={[...publicPageNavigation, { href: "/app", icon: "spacehub", label: "SpaceHub" }]}
                renderIcon={(item) => item.icon ? <RelayIcon className="size-[1.125rem]" name={item.icon} /> : null}
              />
            </div>
            <details className="nav-profile-menu group relative hidden shrink-0 xl:block">
            <summary aria-label={`Profile menu for ${account.display_name}`} className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-surface px-2.5 text-sm font-semibold text-ink transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-soft focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
              <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-xs text-secondary-foreground">{account.display_name.trim().charAt(0).toUpperCase()}</span>
              <span className="hidden max-w-40 truncate sm:inline">{account.display_name}</span>
              <svg aria-hidden="true" className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" fill="none" viewBox="0 0 24 24"><path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
            </summary>
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-48 rounded-card border border-line bg-surface p-2 text-ink shadow-card">
              <Link className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-soft focus-visible:outline-focus" href="/app/profile">My Profile</Link>
              <div className="my-1 border-t border-line" />
              <SignOutButton />
            </div>
            </details>
            <div className="hidden xl:block">
              <ThemeToggle compact />
            </div>
          </div>
        </PageContainer>
      </header>
    );
  }

  if (status === "loading") {
    return <header aria-label="Loading navigation" className="relative z-10 min-h-16 border-b border-line/70 bg-canvas/90" />;
  }

  return (
    <header className="landing-public-nav relative z-10 border-b border-line/70 bg-canvas/90 backdrop-blur">
      <PageContainer className="flex min-h-16 min-w-0 items-center gap-2 py-2 sm:gap-4 sm:py-3">
        <div className="shrink-0">
          <SiteBrand />
        </div>

        <nav aria-label="Main navigation" className="ml-auto hidden xl:block">
          <ul className="flex items-center gap-1">
            {publicPageNavigation.map((item) => {
              const isActive = item.href === pathname;
              return (
                <li key={item.href}>
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={`group inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-[background-color,color,transform] duration-150 active:translate-y-px focus-visible:outline-focus ${
                      isActive
                        ? "bg-soft text-primary"
                        : "text-muted hover:bg-soft hover:text-ink"
                    }`}
                    href={item.href}
                  >
                    {item.icon ? (
                      <RelayIcon
                        className="size-4 transition-transform group-hover:scale-105"
                        name={item.icon}
                      />
                    ) : null}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 xl:ml-3">
          {signInItem ? (
            <Link
              aria-current={signInItem.href === pathname ? "page" : undefined}
              className="group hidden min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted transition-[background-color,color,transform] duration-150 hover:bg-soft hover:text-ink active:translate-y-px focus-visible:outline-focus xl:inline-flex"
              href={signInItem.href}
            >
              {signInItem.icon ? (
                <RelayIcon
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  name={signInItem.icon}
                />
              ) : null}
              {signInItem.label}
            </Link>
          ) : null}
          {createAccountItem ? (
            <Link
              aria-current={
                createAccountItem.href === pathname ? "page" : undefined
              }
              className="group hidden min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-primary-hover active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus xl:inline-flex"
              href={createAccountItem.href}
            >
              {createAccountItem.icon ? (
                <RelayIcon
                  className="size-4 transition-transform group-hover:scale-105"
                  name={createAccountItem.icon}
                />
              ) : null}
              {createAccountItem.label}
            </Link>
          ) : null}
          <div className="xl:hidden">
            <MobileNavigation
              actions={
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
                    <span className="text-sm font-medium text-muted">Appearance</span>
                    <ThemeToggle compact />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {signInItem ? (
                      <Link className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-2 text-xs font-semibold text-ink transition-colors hover:bg-soft focus-visible:outline-focus" href={signInItem.href}>
                        <RelayIcon className="size-[1.125rem]" name="sign-in" />
                        {signInItem.label}
                      </Link>
                    ) : null}
                    {createAccountItem ? (
                      <Link className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" href={createAccountItem.href}>
                        <RelayIcon className="size-[1.125rem]" name="create-account" />
                        Create account
                      </Link>
                    ) : null}
                  </div>
                </div>
              }
              ariaLabel="Main navigation"
              desktopMinWidth={1280}
              items={publicPageNavigation}
              renderIcon={(item) => item.icon ? <RelayIcon className="size-[1.125rem]" name={item.icon} /> : null}
            />
          </div>
          <div className="hidden xl:block">
            <ThemeToggle compact />
          </div>
        </div>
      </PageContainer>
    </header>
  );
}
