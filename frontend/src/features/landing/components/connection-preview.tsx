export function ConnectionPreview() {
  return (
    <div
      aria-label="Illustrative preview of a connection request"
      className="landing-card mx-auto max-w-xl rounded-3xl border border-line bg-soft p-4 sm:p-6"
      role="img"
    >
      <article className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Incoming request
        </p>
        <div className="mt-5 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-primary"
          >
            M
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Relay member</p>
            <p className="mt-1 text-xs text-muted">Public profile</p>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-muted">
          A connection request is waiting for your decision.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <span className="inline-flex min-h-10 items-center justify-center rounded-full border border-line bg-surface px-4 text-xs font-semibold text-ink">
            Reject
          </span>
          <span className="inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground">
            Accept
          </span>
        </div>
      </article>
      <p className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-accent px-3 py-3 text-center text-xs leading-5 text-ink">
        <span aria-hidden="true" className="text-primary">✓</span>
        Private messaging starts after acceptance.
      </p>
    </div>
  );
}
