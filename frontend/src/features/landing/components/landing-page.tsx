import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { ActionLink } from "@/components/ui/action-link";
import { RelayIcon } from "@/components/ui/relay-icon";
import { ConnectionPreview } from "@/features/landing/components/connection-preview";
import { ConversationPreview } from "@/features/landing/components/conversation-preview";
import { DiscoveryPreview } from "@/features/landing/components/discovery-preview";
import { ScrollReveal } from "@/features/landing/components/scroll-reveal";
import { TypewriterText } from "@/features/landing/components/typewriter-text";

const steps = [
  {
    number: "01",
    title: "Find someone interesting",
    description:
      "Look up members by username and get to know them through the profile details they choose to share.",
  },
  {
    number: "02",
    title: "Make it mutual",
    description:
      "Send a connection request. The other person can accept or reject it; nothing is automatic.",
  },
  {
    number: "03",
    title: "Start a conversation",
    description:
      "Once a request is accepted, you can message one another in a private, one-to-one conversation.",
  },
] as const;

const privacyPrinciples = [
  {
    title: "A mutual connection",
    description:
      "Messaging is available only when both people are connected and neither has blocked the other.",
  },
  {
    title: "Just two people",
    description:
      "Relay conversations are one-to-one, between you and the connection you chose.",
  },
  {
    title: "Your boundaries stay yours",
    description:
      "You can remove a connection or block someone. Either stops new messages; existing history remains available to participants.",
  },
] as const;

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

export function LandingPage() {
  return (
    <div className="landing-page">
      <section
        aria-labelledby="hero-heading"
        className="bg-soft py-14 sm:py-20 lg:py-24"
      >
        <PageContainer className="grid items-center gap-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <div className="max-w-2xl">
            <p className="motion-rise mb-6 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              A little closer, one hello at a time
            </p>
            <h1
              className="motion-rise-delayed text-balance text-[clamp(3rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.075em] text-ink"
              id="hero-heading"
            >
              Less noise.
              <br />
              <span className="block min-h-[2.1em] text-primary sm:min-h-[1.05em]">
                <span className="sr-only">More connection.</span>
                <TypewriterText />
              </span>
            </h1>
            <p className="motion-rise-later mt-6 max-w-xl text-pretty text-base leading-7 text-muted sm:text-lg sm:leading-8">
              Discover people by username, connect by choice, and keep messages
              between you and the people you have mutually connected with.
            </p>
            <div className="motion-pop mt-8 flex flex-col gap-3 xs:flex-row">
              <ActionLink href="/register">
                <RelayIcon name="create-account" />
                Create an account
              </ActionLink>
              <ActionLink href="/login" variant="secondary">
                <RelayIcon name="sign-in" />
                Sign in
              </ActionLink>
            </div>
            <p className="mt-8 text-xs font-medium tracking-wide text-muted">
              PRIVATE, ONE-TO-ONE CONVERSATIONS
            </p>
          </div>

          <div className="motion-rise-delayed px-1 sm:px-6 lg:px-0">
            <ConversationPreview compact />
          </div>
        </PageContainer>
      </section>

      <section
        aria-labelledby="how-it-works-heading"
        className="scroll-mt-24 py-16 sm:py-20 lg:py-24"
        id="how-it-works"
      >
        <ScrollReveal>
          <PageContainer>
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                How Relay works
              </p>
              <h2
                className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.055em] text-ink sm:text-4xl"
                id="how-it-works-heading"
              >
                A good conversation starts simply.
              </h2>
              <p className="mt-3 text-base leading-7 text-muted">
                Three thoughtful steps, from discovering a profile to saying hello.
              </p>
            </div>

            <ol className="mt-9 grid gap-4 md:grid-cols-3">
              {steps.map((step) => (
                <li
                  className="landing-card rounded-2xl border border-line bg-soft p-6 sm:p-7"
                  key={step.number}
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-primary">
                    {step.number}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold tracking-[-0.035em] text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </PageContainer>
        </ScrollReveal>
      </section>

      <section
        aria-labelledby="discover-heading"
        className="border-y border-line bg-soft py-16 sm:py-20 lg:py-24"
        id="discover"
      >
        <ScrollReveal>
          <PageContainer className="grid items-center gap-12 md:grid-cols-[1.05fr_0.95fr] md:gap-16">
            <div className="order-2 md:order-1">
              <DiscoveryPreview />
            </div>
            <div className="order-1 max-w-xl md:order-2">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                01 / Find your people
              </p>
              <h2
                className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.055em] text-ink sm:text-4xl"
                id="discover-heading"
              >
                Someone interesting is a search away.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
                Look up Relay members by username. Take a moment with the public
                profile details they choose to share before you decide to connect.
              </p>
              <ul className="mt-5 space-y-3 text-sm text-ink">
                <li className="flex gap-3">
                  <span aria-hidden="true" className="text-primary">✓</span>
                  Browse by username
                </li>
                <li className="flex gap-3">
                  <span aria-hidden="true" className="text-primary">✓</span>
                  See a member&apos;s public profile
                </li>
              </ul>
              <Link
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-primary transition-colors hover:text-primary-hover hover:underline focus-visible:outline-focus"
                href="/register"
              >
                Create your account
                <RelayIcon name="arrow-right" />
              </Link>
            </div>
          </PageContainer>
        </ScrollReveal>
      </section>

      <section
        aria-labelledby="connection-heading"
        className="scroll-mt-24 py-16 sm:py-20 lg:py-24"
        id="connection"
      >
        <ScrollReveal>
          <PageContainer className="grid items-center gap-12 md:grid-cols-[0.95fr_1.05fr] md:gap-16">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                02 / Make it mutual
              </p>
              <h2
                className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.055em] text-ink sm:text-4xl"
                id="connection-heading"
              >
                A conversation takes two yeses.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
                Send a connection request. The recipient chooses whether to
                accept or reject it, and messaging becomes available only after
                acceptance.
              </p>
              <ul className="mt-5 space-y-3 text-sm text-ink">
                <li className="flex gap-3">
                  <span aria-hidden="true" className="text-primary">✓</span>
                  Review incoming and sent requests
                </li>
                <li className="flex gap-3">
                  <span aria-hidden="true" className="text-primary">✓</span>
                  Accept or reject an incoming request
                </li>
              </ul>
            </div>
            <ConnectionPreview />
          </PageContainer>
        </ScrollReveal>
      </section>

      <section
        aria-labelledby="messaging-heading"
        className="border-y border-line bg-soft py-16 sm:py-20 lg:py-24"
        id="messaging"
      >
        <ScrollReveal>
          <PageContainer className="grid items-center gap-12 md:grid-cols-[1.05fr_0.95fr] md:gap-16">
            <div className="md:order-1">
              <ConversationPreview />
            </div>
            <div className="max-w-xl md:order-2">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                03 / Say hello
              </p>
              <h2
                className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.055em] text-ink sm:text-4xl"
                id="messaging-heading"
              >
                A little space. Just the two of you.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
                Once you are connected, exchange messages in a private
                one-to-one conversation. Messages appear in order, with status
                shown as Relay confirms it.
              </p>
              <ul className="mt-5 space-y-3 text-sm text-ink">
                <li className="flex gap-3">
                  <span aria-hidden="true" className="text-primary">✓</span>
                  One-to-one conversations
                </li>
                <li className="flex gap-3">
                  <span aria-hidden="true" className="text-primary">✓</span>
                  Sent, delivered, and read statuses
                </li>
              </ul>
              <Link
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-primary transition-colors hover:text-primary-hover hover:underline focus-visible:outline-focus"
                href="/register"
              >
                Start with a connection
                <RelayIcon name="arrow-right" />
              </Link>
            </div>
          </PageContainer>
        </ScrollReveal>
      </section>

      <section
        aria-labelledby="why-relay-heading"
        className="scroll-mt-24 bg-ink py-16 text-surface sm:py-20 lg:py-24"
        id="why-relay"
      >
        <ScrollReveal>
          <PageContainer>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">
              Built around choice
            </p>
            <h2
              className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.055em] text-surface sm:text-4xl"
              id="why-relay-heading"
            >
              Your space. Your pace.
            </h2>
            <div className="mt-9 grid gap-8 md:grid-cols-3 md:gap-10">
              {privacyPrinciples.map((principle) => (
                <article key={principle.title}>
                  <h3 className="text-base font-semibold text-surface">
                    {principle.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-surface/75">
                    {principle.description}
                  </p>
                </article>
              ))}
            </div>
          </PageContainer>
        </ScrollReveal>
      </section>

      <section
        aria-labelledby="faq-heading"
        className="scroll-mt-24 py-16 sm:py-20 lg:py-24"
        id="faqs"
      >
        <ScrollReveal>
          <PageContainer className="grid gap-10 md:grid-cols-[0.75fr_1.25fr] md:gap-16">
            <div className="max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                Good questions
              </p>
              <h2
                className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.055em] text-ink sm:text-4xl"
                id="faq-heading"
              >
                A few things you might wonder.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                The essentials, before your first hello.
              </p>
            </div>
            <div className="divide-y divide-line border-y border-line">
              {questions.map((item) => (
                <details className="group py-4" key={item.question}>
                  <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-5 text-sm font-semibold text-ink marker:hidden focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
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
          </PageContainer>
        </ScrollReveal>
      </section>

      <section
        aria-labelledby="cta-heading"
        className="bg-accent py-16 text-center sm:py-20 lg:py-24"
        id="get-started"
      >
        <ScrollReveal>
          <PageContainer>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
              One hello can go a long way
            </p>
            <h2
              className="mx-auto mt-3 max-w-3xl text-balance text-3xl font-semibold leading-tight tracking-[-0.055em] text-ink sm:text-4xl"
              id="cta-heading"
            >
              Your next good conversation starts here.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted sm:text-base">
              Create your profile. Find your people. See where a conversation takes you.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 xs:flex-row">
              <ActionLink href="/register">
                <RelayIcon name="create-account" />
                Create an account
              </ActionLink>
              <ActionLink href="/login" variant="secondary">
                <RelayIcon name="sign-in" />
                Sign in
              </ActionLink>
            </div>
          </PageContainer>
        </ScrollReveal>
      </section>
    </div>
  );
}
