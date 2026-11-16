import type { Metadata } from "next";
import { DesignSystemShowcase } from "@/components/ui/design-system-showcase";

export const metadata: Metadata = {
  title: "Design system — Relay",
  description: "A component showcase for the Relay frontend design system.",
};

export default function DesignSystemPage() {
  return <DesignSystemShowcase />;
}
