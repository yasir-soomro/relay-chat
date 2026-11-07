import type { Metadata } from "next";
import { AuthPage } from "@/features/auth/components/auth-page";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Sign in | Relay",
  description: "Sign in to your Relay account.",
};

export default function LoginPage() {
  return (
    <AuthPage
      description="Welcome back. Sign in to pick up where you left off."
      eyebrow="Welcome back"
      heading="Sign in to Relay"
    >
      <LoginForm />
    </AuthPage>
  );
}
