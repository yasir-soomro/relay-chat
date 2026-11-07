"use client";

import { ActionLink } from "@/components/ui/action-link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-16">
      <div className="w-full max-w-lg text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
          A small interruption
        </p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.06em] text-ink">
          That didn&apos;t go as planned.
        </h1>
        <p className="mt-4 leading-7 text-muted">
          Something went wrong. You can try again or head back to Relay.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            onClick={reset}
            type="button"
          >
            Try again
          </Button>
          <ActionLink href="/" variant="secondary">
            Back to Relay
          </ActionLink>
        </div>
      </div>
    </main>
  );
}
