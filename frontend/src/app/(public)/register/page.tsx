import type { Metadata } from "next";
import { RegistrationPage } from "@/features/auth/components/registration-page";

export const metadata: Metadata = {
  title: "Create an account | Relay",
  description:
    "Create a Relay account to discover members, make mutual connections, and start a private conversation.",
};

export default function RegisterPage() {
  return <RegistrationPage />;
}
