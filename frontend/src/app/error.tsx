"use client";

import Link from "next/link";

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
          <button
            className="min-h-12 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-moss"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-soft"
            href="/"
          >
            Back to Relay
          </Link>
        </div>
      </div>
    </main>
  );
}
