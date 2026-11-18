import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { RelayIcon } from "@/components/ui/relay-icon";
import { ScrollReveal } from "@/features/landing/components/scroll-reveal";

export const metadata: Metadata = {
  title: "How Relay works",
  description:
    "See how Relay helps you discover people, connect by choice, and start a private one-to-one conversation.",
};

const steps = [
  {
    number: "01",
    icon: "discover",
    title: "Discover someone",
    description:
      "Search for members by username and take a look at the profile details they choose to share.",
  },
  {
    number: "02",
    icon: "request",
    title: "Connect by choice",
    description:
      "Send a request and let the other person decide. A connection starts only when they accept.",
  },
  {
    number: "03",
    icon: "messages",
    title: "Start a conversation",
    description:
      "Once you are connected, send messages in a private conversation between the two of you.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="how-it-works-page landing-page">
      <section aria-labelledby="how-it-works-heading" className="how-hero bg-soft py-12 sm:py-16 lg:py-20">
        <PageContainer className="grid items-center gap-9 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div className="how-hero-copy max-w-xl">
            <p className="motion-rise inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
              How Relay works
            </p>
            <h1 className="motion-rise-delayed mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.06em] text-ink sm:text-5xl lg:text-[3.5rem]" id="how-it-works-heading">
              Make a connection. <span className="text-primary">Start a conversation.</span>
            </h1>
            <p className="motion-rise-later mt-5 max-w-lg text-base leading-7 text-muted sm:text-lg sm:leading-8">
              Find people by username, connect when you both choose to, then enjoy a private one-to-one chat.
            </p>
            <div className="motion-pop mt-7 flex flex-col gap-3 xs:flex-row">
              <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" href="/register">
                Create an account <RelayIcon name="arrow-right" />
              </Link>
              <Link className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface px-5 text-sm font-semibold text-ink transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus" href="/login">
                Sign in
              </Link>
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Private by design · mutual by choice
            </p>
          </div>

          <figure className="how-demo-visual">
            <div className="how-demo-frame relative aspect-square overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-card sm:rounded-[2rem]">
              <Image
                alt="Relay Chat demo showing a private conversation on a phone"
                className="how-demo-image object-cover"
                fill
                priority
                sizes="(max-width: 1023px) 100vw, 55vw"
                src="/images/Relay%20Chat%20App%20Demo.png"
              />
              <div aria-hidden="true" className="how-demo-shade" />
              <figcaption className="how-demo-caption absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-2xl border border-line/80 bg-surface/90 p-3 shadow-card backdrop-blur sm:inset-x-5 sm:bottom-5 sm:p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary"><RelayIcon name="lock" /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">A more personal kind of chat</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted">Only after you both connect.</span>
                </span>
              </figcaption>
            </div>
          </figure>
        </PageContainer>
      </section>

      <section aria-labelledby="steps-heading" className="how-steps-section py-14 sm:py-18 lg:py-20">
        <ScrollReveal>
          <PageContainer>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Simple, thoughtful, mutual</p>
              <h2 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.055em] text-ink sm:text-4xl" id="steps-heading">Three steps to a good conversation.</h2>
              <p className="mt-3 text-sm leading-7 text-muted sm:text-base">You stay in control at every step, from the first search to the first message.</p>
            </div>
            <ol className="how-steps mt-9 grid gap-4 md:grid-cols-3 md:gap-5">
              {steps.map((step) => (
                <li className="how-step-card landing-card relative rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" key={step.number}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary"><RelayIcon className="size-5" name={step.icon} /></span>
                    <span className="text-xs font-semibold tracking-[0.12em] text-muted">STEP {step.number}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em] text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{step.description}</p>
                </li>
              ))}
            </ol>
          </PageContainer>
        </ScrollReveal>
      </section>
    </div>
  );
}
