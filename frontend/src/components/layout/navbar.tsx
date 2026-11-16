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

const publicPageNavigation = siteNavigation.filter(
  (item) => item.href !== "/login" && item.href !== "/register",
);
const signInItem = siteNavigation.find((item) => item.href === "/login");
const createAccountItem = siteNavigation.find(
  (item) => item.href === "/register",
);

export function Navbar() {
  const pathname = usePathname();

  if (pathname === "/register" || pathname === "/login") {
    return <AuthNavbar mode={pathname === "/register" ? "register" : "login"} />;
  }

  return (
    <header className="landing-public-nav relative z-10 border-b border-line/70 bg-canvas/90 backdrop-blur">
      <PageContainer className="flex min-h-16 items-center gap-2 py-2 sm:gap-4 sm:py-3">
        <SiteBrand />

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
          <ThemeToggle compact />
          <div className="xl:hidden">
            <MobileNavigation
              ariaLabel="Main navigation"
              desktopMinWidth={1280}
              items={siteNavigation}
            />
          </div>
        </div>
      </PageContainer>
    </header>
  );
}
