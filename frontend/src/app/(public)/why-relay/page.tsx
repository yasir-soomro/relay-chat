import type { Metadata } from "next";
import { InformationPage } from "@/features/landing/components/information-page";

export const metadata: Metadata = {
  title: "Why Relay",
  description:
    "Relay puts mutual connections, private one-to-one conversations, and personal boundaries first.",
};

const principles = [
  {
    title: "Connection is mutual",
    description:
      "Messaging is available only after a connection request is accepted, while the connection is active and neither person has blocked the other.",
  },
  {
    title: "Conversations stay one-to-one",
    description:
      "Relay conversations are between you and the connection you chose.",
  },
  {
    title: "Your boundaries stay yours",
    description:
      "You can remove a connection or block someone. Either stops new messages; existing history remains available to participants.",
  },
] as const;

export default function WhyRelayPage() {
  return (
    <InformationPage
      description="A more personal way to connect, with clear choices at every step."
      eyebrow="Built around choice"
      heading="Your space. Your pace."
    >
      <ul className="divide-y divide-line border-y border-line">
        {principles.map((principle) => (
          <li className="py-5 first:pt-0 last:pb-0" key={principle.title}>
            <h2 className="text-base font-semibold text-ink">
              {principle.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {principle.description}
            </p>
          </li>
        ))}
      </ul>
    </InformationPage>
  );
}
