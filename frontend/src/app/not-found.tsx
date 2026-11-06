import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-16">
      <div className="w-full max-w-lg text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
          404
        </p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.06em] text-ink">
          This page wandered off.
        </h1>
        <p className="mt-4 leading-7 text-muted">
          The link may be out of date, or the page may have moved.
        </p>
        <Link
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-moss"
          href="/"
        >
          Return to Relay
        </Link>
      </div>
    </main>
  );
}
