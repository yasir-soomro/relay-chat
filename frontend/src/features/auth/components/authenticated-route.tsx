"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function AuthenticatedRoute({ children }: { children: ReactNode }) {
  const { status, error, restoreSession } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);

  async function handleRetry() {
    setIsRetrying(true);
    try {
      await restoreSession();
    } finally {
      setIsRetrying(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router, status]);

  if (status === "authenticated") {
    return children;
  }

  if (status === "error") {
    return (
      <main
        aria-labelledby="session-error-heading"
        className="grid min-h-screen place-content-center gap-4 px-6 text-center"
      >
        <h1
          className="text-2xl font-semibold text-ink"
          id="session-error-heading"
        >
          We couldn&apos;t verify your session
        </h1>
        <p className="max-w-md text-sm leading-6 text-muted" role="alert">
          {error ?? "Relay could not restore your session."}
        </p>
        <Button
          className="mx-auto"
          disabled={isRetrying}
          onClick={() => void handleRetry()}
          type="button"
        >
          {isRetrying ? "Checking..." : "Try again"}
        </Button>
      </main>
    );
  }

  return (
    <main
      aria-live="polite"
      className="grid min-h-screen place-content-center px-6 text-sm text-muted"
      role="status"
    >
      Checking your session…
    </main>
  );
}
