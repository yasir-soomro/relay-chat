import { Suspense } from "react";
import type { ReactNode } from "react";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { AuthenticatedRoute } from "@/features/auth/components/authenticated-route";

export default function AuthenticatedGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <Suspense
      fallback={
        <main
          aria-live="polite"
          className="grid min-h-screen place-content-center px-6 text-sm text-muted"
          role="status"
        >
          Checking your session…
        </main>
      }
    >
      <AuthenticatedRoute>
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      </AuthenticatedRoute>
    </Suspense>
  );
}
