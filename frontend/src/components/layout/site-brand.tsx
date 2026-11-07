import Link from "next/link";

export function SiteBrand() {
  return (
    <Link
      aria-label="Relay home"
      className="inline-flex items-center gap-2.5 rounded-md"
      href="/"
    >
      <span
        aria-hidden="true"
        className="grid size-9 place-items-center rounded-xl bg-ink text-sm font-bold tracking-tight text-accent"
      >
        r.
      </span>
      <span className="text-xl font-semibold tracking-[-0.06em]">relay</span>
    </Link>
  );
}
