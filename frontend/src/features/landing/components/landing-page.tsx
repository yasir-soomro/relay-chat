import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { ActionLink } from "@/components/ui/action-link";
import { ConversationPreview } from "@/features/landing/components/conversation-preview";

const principles = [
  {
    id: "personal",
    number: "01",
    title: "A little more personal",
    description:
      "Keep the focus on one-to-one conversations and the people you choose to connect with.",
  },
  {
    id: "privacy",
    number: "02",
    title: "Private by design",
    description:
      "Your conversations belong to you and the person you chose to share them with.",
  },
  {
    id: "no-rush",
    number: "03",
    title: "No rush to reply",
    description:
      "Good conversations can pick up right where they left off, whenever you are ready.",
  },
] as const;

export function LandingPage() {
  return (
    <div>
      <section aria-labelledby="hero-heading" className="py-12 sm:py-16 lg:py-20">
        <PageContainer className="grid items-center gap-14 pb-12 sm:pb-16 lg:grid-cols-[1.03fr_0.97fr] lg:gap-10 lg:pb-20">
          <div className="motion-rise relative z-10 max-w-2xl">
            <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold tracking-wide text-moss sm:text-sm">
              <span aria-hidden="true" className="size-2 rounded-full bg-accent-strong" />
              A more human way to stay close
            </p>
            <h1
              className="text-balance text-[clamp(3.2rem,7vw,5.75rem)] font-medium leading-[0.99] tracking-[-0.075em] text-ink"
              id="hero-heading"
            >
              Good conversations deserve{" "}
              <span className="relative inline-block">
                room to breathe
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 -z-10 h-3 w-full rounded-full bg-accent sm:-bottom-2 sm:h-4"
                />
              </span>
              .
            </h1>
            <p className="mt-7 max-w-xl text-pretty text-base leading-7 text-muted sm:mt-8 sm:text-lg sm:leading-8">
              Relay is a more thoughtful space for private, one-to-one
              conversations—with the people you choose, at a pace that feels
              like yours.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ActionLink href="#principles">Get to know Relay</ActionLink>
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-soft"
                href="#privacy"
              >
                What matters to us
              </Link>
            </div>
            <p className="mt-8 text-xs font-medium tracking-wide text-muted">
              MADE FOR MEANINGFUL MOMENTS, BIG AND SMALL
            </p>
          </div>

          <div className="motion-rise-delayed relative px-2 py-4 sm:px-8 lg:px-0">
            <ConversationPreview />
            <p className="mt-10 text-center text-xs font-medium tracking-wide text-muted">
              A little space for the people who matter
            </p>
          </div>
        </PageContainer>
      </section>

      <section
        aria-labelledby="principles-heading"
        className="border-y border-line bg-[#f0f3eb] py-20 sm:py-24 lg:py-28"
        id="principles"
      >
        <PageContainer>
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
              A different kind of space
            </p>
            <h2
              className="mt-4 text-balance text-3xl font-medium leading-tight tracking-[-0.055em] text-ink sm:text-4xl lg:text-5xl"
              id="principles-heading"
            >
              Less noise. More of what makes a conversation matter.
            </h2>
          </div>

          <div className="mt-12 grid gap-4 md:mt-16 md:grid-cols-3 md:gap-5">
            {principles.map((principle) => (
              <article
                className="rounded-card border border-line/80 bg-surface p-6 sm:p-8"
                id={principle.id}
                key={principle.number}
              >
                <p className="text-xs font-semibold tracking-[0.14em] text-moss">
                  {principle.number}
                </p>
                <h3 className="mt-8 text-xl font-semibold tracking-[-0.04em] text-ink sm:mt-12">
                  {principle.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {principle.description}
                </p>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="py-20 sm:py-24 lg:py-28">
        <PageContainer className="flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
              Stay a little closer
            </p>
            <h2 className="mt-4 text-balance text-3xl font-medium leading-tight tracking-[-0.055em] text-ink sm:text-4xl lg:text-5xl">
              Make room for a good conversation.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted">
              A calmer, more considered way to keep in touch is on its way.
            </p>
          </div>
          <ActionLink className="shrink-0" href="#main-content" variant="secondary">
            Back to the beginning
          </ActionLink>
        </PageContainer>
      </section>
    </div>
  );
}
