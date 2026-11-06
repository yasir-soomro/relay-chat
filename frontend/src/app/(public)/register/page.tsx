import type { Metadata } from "next";
import { AuthPage } from "@/features/auth/components/auth-page";
import { RegistrationForm } from "@/features/auth/components/registration-form";

export const metadata: Metadata = {
  title: "Create an account | Relay",
  description: "Create your Relay account.",
};

export default function RegisterPage() {
  return (
    <AuthPage
      description="Create an account and make a little room for your people."
      eyebrow="Start a conversation"
      heading="Join Relay"
    >
      <RegistrationForm />
    </AuthPage>
  );
}
