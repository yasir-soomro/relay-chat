import type { Metadata } from "next";
import { InformationPage } from "@/features/landing/components/information-page";

export const metadata: Metadata = {
  title: "FAQs | Relay",
  description: "Answers about Relay profiles, connection requests, and messaging.",
};

const questions = [
  {
    question: "What is Relay?",
    answer:
      "Relay is a place to discover members, choose who to connect with, and have private one-to-one conversations.",
  },
  {
    question: "Can I message someone before they accept my request?",
    answer:
      "No. New messages are available only after a connection request is accepted and the connection is not blocked or removed.",
  },
  {
    question: "What can other people see on my profile?",
    answer:
      "Public profiles show your username, display name, and bio. Your email and credentials are not public profile details.",
  },
  {
    question: "What happens when a request is rejected?",
    answer:
      "A rejected request does not create a connection or unlock messaging. Relay does not promise a particular retry time.",
  },
  {
    question: "What happens if I remove or block a connection?",
    answer:
      "You can no longer send new messages while the connection is removed or blocked. Conversation history remains available to its participants. After unblocking, a new request must be accepted before messaging resumes.",
  },
  {
    question: "What do message statuses mean?",
    answer:
      "Sent, delivered, and read indicate the status Relay has confirmed for a message.",
  },
] as const;

export default function FrequentlyAskedQuestionsPage() {
  return (
    <InformationPage
      description="The essentials, before your first hello."
      eyebrow="Good questions"
      heading="A few things you might wonder."
    >
      <div className="divide-y divide-line border-y border-line">
        {questions.map((item) => (
          <details className="group py-4" key={item.question}>
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-5 text-sm font-semibold text-ink marker:hidden focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                aria-hidden="true"
                className="shrink-0 text-lg font-normal text-primary transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="max-w-2xl pt-3 pr-7 text-sm leading-6 text-muted">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </InformationPage>
  );
}
