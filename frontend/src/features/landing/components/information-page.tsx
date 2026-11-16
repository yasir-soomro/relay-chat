import type { ReactNode } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { RelayIcon } from "@/components/ui/relay-icon";

type InformationPageProps = {
  children: ReactNode;
  description: string;
  eyebrow: string;
  heading: string;
};

export function InformationPage({
  children,
  description,
  eyebrow,
  heading,
}: InformationPageProps) {
  return (
    <div className="landing-page">
      <section className="py-14 sm:py-18 lg:py-20">
        <PageContainer>
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.055em] text-ink sm:text-4xl">
              {heading}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">
              {description}
            </p>
            <div className="mt-8">{children}</div>
            <Link
              className="mt-9 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-primary transition-colors hover:text-primary-hover hover:underline focus-visible:outline-focus"
              href="/register"
            >
              Create an account
              <RelayIcon name="arrow-right" />
            </Link>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
