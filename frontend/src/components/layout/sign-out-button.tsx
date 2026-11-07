"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
    <Button
      className="px-4 font-medium disabled:cursor-wait"
      disabled={isSigningOut}
      onClick={() => void handleSignOut()}
      type="button"
      variant="quiet"
    >
      {isSigningOut ? "Signing out…" : "Sign out"}
    </Button>
  );
}
