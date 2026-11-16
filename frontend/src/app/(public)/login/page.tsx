import type { Metadata } from "next";
import { LoginPage as LoginScreen } from "@/features/auth/components/login-page";

export const metadata: Metadata = {
  title: "Sign in | Relay",
  description: "Sign in to your Relay account.",
};

export default function LoginPage() {
  return <LoginScreen />;
}
