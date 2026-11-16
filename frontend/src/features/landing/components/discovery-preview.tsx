export function DiscoveryPreview() {
  return (
    <div
      aria-label="Illustrative preview of a member discovery card"
      className="landing-card mx-auto max-w-xl rounded-3xl border border-line bg-surface p-4 shadow-card sm:p-6"
      role="img"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">Discover members</p>
          <p className="mt-1 text-xs text-muted">Search by username</p>
        </div>
        <span className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
          <svg
            aria-hidden="true"
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8" />
            <path d="m16 16 4.5 4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
        </span>
      </div>

      <div className="mt-5 flex min-h-11 items-center gap-3 rounded-xl border border-line bg-canvas px-4 text-sm text-muted">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
        Search usernames
      </div>

      <article className="mt-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-primary"
          >
            P
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Public profile</p>
            <p className="mt-0.5 truncate text-xs text-muted">
              Username · display name
            </p>
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-soft px-3 py-3 text-xs leading-5 text-muted">
          Bio details shared by this member appear here.
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-muted">Profile details</span>
          <span className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
            Send request
          </span>
        </div>
      </article>
      <p className="mt-4 text-center text-[11px] leading-5 text-muted">
        Public profile details are chosen by each member.
      </p>
    </div>
  );
}
