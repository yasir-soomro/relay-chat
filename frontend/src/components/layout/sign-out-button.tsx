"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/providers/auth-provider";

export function SignOutButton() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch {
      router.replace("/login");
    }
    router.replace("/login");
    setIsSigningOut(false);
  }

  return (
    <button
      className="min-h-11 rounded-full border border-line px-4 text-sm font-medium text-muted transition-colors hover:bg-soft hover:text-ink focus-visible:outline-moss disabled:cursor-wait disabled:opacity-60"
      disabled={isSigningOut}
      onClick={() => void handleSignOut()}
      type="button"
    >
      {isSigningOut ? "Signing out…" : "Sign out"}
    </button>
  );
}
