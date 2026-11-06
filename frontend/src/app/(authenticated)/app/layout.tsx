import type { ReactNode } from "react";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";

export default function AppRouteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
