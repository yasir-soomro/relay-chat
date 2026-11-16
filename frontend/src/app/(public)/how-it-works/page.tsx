import type { Metadata } from "next";
import { InformationPage } from "@/features/landing/components/information-page";

export const metadata: Metadata = {
  title: "How Relay works",
  description:
    "Discover Relay members, connect by choice, and start a private one-to-one conversation.",
};

const steps = [
  {
    title: "Discover",
    description:
      "Look up members by username and review the public profile details they choose to share.",
  },
  {
    title: "Connect",
    description:
      "Send a connection request. The other person can accept or reject it; nothing is automatic.",
  },
  {
    title: "Say hello",
    description:
      "Once a request is accepted, you can message one another in a private, one-to-one conversation.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <InformationPage
      description="Three simple steps take you from discovering a profile to starting a conversation."
      eyebrow="How Relay works"
      heading="A good conversation starts simply."
    >
      <ol className="grid gap-4 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li
            className="rounded-2xl border border-line bg-surface p-5"
            key={step.title}
          >
            <span className="text-xs font-semibold text-primary">
              0{index + 1}
            </span>
            <h2 className="mt-3 text-base font-semibold text-ink">
              {step.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </InformationPage>
  );
}
