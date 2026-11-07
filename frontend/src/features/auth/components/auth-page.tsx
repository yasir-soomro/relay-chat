import type { ReactNode } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { surfaceCardClassName } from "@/components/ui/card";

type AuthPageProps = {
  children: ReactNode;
  description: string;
  eyebrow: string;
  heading: string;
};

export function AuthPage({
  children,
  description,
  eyebrow,
  heading,
}: AuthPageProps) {
  return (
    <PageContainer className="grid min-h-[min(48rem,calc(100vh-9rem))] items-center gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.82fr)] lg:gap-16 lg:py-16">
      <section className="motion-rise hidden max-w-xl lg:block">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
          A space for your people
        </p>
        <h2 className="mt-5 text-balance text-5xl font-medium leading-[1.05] tracking-[-0.07em] text-ink xl:text-6xl">
          A little closer, one conversation at a time.
        </h2>
        <p className="mt-6 max-w-lg text-lg leading-8 text-muted">
          Private, one-to-one conversations with the people you choose, at a
          pace that feels like yours.
        </p>
        <Link
          className="mt-8 inline-flex rounded-sm text-sm font-semibold text-moss underline-offset-4 transition-colors hover:text-ink hover:underline"
          href="/#principles"
        >
          Get to know Relay
        </Link>
      </section>

      <section
        aria-labelledby="auth-heading"
        className={`motion-rise-delayed mx-auto w-full max-w-md ${surfaceCardClassName} p-6 sm:p-8 lg:mx-0 lg:justify-self-end`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
          {eyebrow}
        </p>
        <h1
          className="mt-3 text-3xl font-semibold tracking-[-0.055em] text-ink"
          id="auth-heading"
        >
          {heading}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        <div className="mt-7">{children}</div>
      </section>
    </PageContainer>
  );
}
