"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RelayIcon } from "@/components/ui/relay-icon";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function SignOutButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch {
      // Auth state is cleared locally even if the logout API is unavailable.
    } finally {
      router.replace("/");
      router.refresh();
      setIsSigningOut(false);
    }
  }

  return (
    <Button
      aria-label={iconOnly ? (isSigningOut ? "Signing out" : "Sign out") : undefined}
      className={
        iconOnly
          ? "size-11 min-h-11 shrink-0 px-0 disabled:cursor-wait"
          : "min-h-10 w-full justify-start rounded-lg px-3 py-2 text-sm font-medium disabled:cursor-wait"
      }
      disabled={isSigningOut}
      loading={isSigningOut}
      onClick={() => void handleSignOut()}
      type="button"
      variant="quiet"
    >
      {iconOnly ? (
        <>
          {isSigningOut ? null : <RelayIcon name="sign-out" />}
          <span className="sr-only">
            {isSigningOut ? "Signing out…" : "Sign out"}
          </span>
        </>
      ) : isSigningOut ? (
        "Signing out…"
      ) : (
        "Sign out"
      )}
    </Button>
  );
}
