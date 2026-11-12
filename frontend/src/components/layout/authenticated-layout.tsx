import type { ReactNode } from "react";
import { AppNavbar } from "@/components/layout/app-navbar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageContainer } from "@/components/layout/page-container";
import { ConnectionsProvider } from "@/features/connections/providers/connections-provider";
import { NotificationsProvider } from "@/features/notifications/providers/notifications-provider";

type AuthenticatedLayoutProps = {
  children: ReactNode;
};

export function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  return (
    <NotificationsProvider>
      <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        <a
          className="sr-only z-50 rounded-full bg-surface px-5 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          href="#main-content"
        >
          Skip to content
        </a>
        <AppSidebar />
        <div className="flex min-h-screen min-w-0 flex-col">
          <AppNavbar />
          <main
            className="flex-1 py-8 sm:py-10 lg:py-12"
            id="main-content"
            tabIndex={-1}
          >
            <ConnectionsProvider>
              <PageContainer>{children}</PageContainer>
            </ConnectionsProvider>
          </main>
        </div>
      </div>
    </NotificationsProvider>
  );
}
