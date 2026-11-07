import type { ReactNode } from "react";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { AuthenticatedRoute } from "@/features/auth/components/authenticated-route";

export default function ConversationsLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <AuthenticatedRoute>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </AuthenticatedRoute>
  );
}
