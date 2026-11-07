import { ActionLink } from "@/components/ui/action-link";

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
        <ActionLink className="mt-8" href="/">
          Return to Relay
        </ActionLink>
      </div>
    </main>
  );
}
