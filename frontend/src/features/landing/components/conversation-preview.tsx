export function ConversationPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-label="Illustrative preview of a one-to-one Relay conversation"
      className="landing-card relative mx-auto w-full max-w-lg rounded-3xl"
      role="img"
    >
      <div
        aria-hidden="true"
        className="absolute -left-5 top-12 size-24 rounded-full bg-accent blur-2xl sm:-left-8 sm:size-32"
      />
      <div
        aria-hidden="true"
        className="absolute -right-4 bottom-10 size-28 rounded-full bg-soft blur-2xl sm:-right-8 sm:size-36"
      />

      <div className="relative rounded-3xl border border-line bg-surface p-3 shadow-card sm:p-4">
        <div className="rounded-2xl bg-canvas p-4 sm:p-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-full bg-accent text-xs font-semibold text-primary"
              >
                R
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Conversation</p>
                <p className="mt-0.5 text-xs text-muted">One-to-one</p>
              </div>
            </div>
            <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-primary">
              Connected
            </span>
          </div>

          <div className="flex min-h-60 flex-col justify-end gap-3 py-5 sm:min-h-64">
            <p className="max-w-[84%] self-start rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3 text-sm leading-5 text-ink">
              {compact ? "Thanks for connecting." : "Thanks for reaching out."}
            </p>
            <div className="max-w-[84%] self-end">
              <p className="rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-5 text-primary-foreground">
                Glad we connected.
              </p>
              <p className="mt-1.5 pr-1 text-right text-[11px] text-muted">
                {compact ? "Read" : "Delivered"}
              </p>
            </div>
            {compact ? null : (
              <p className="max-w-[84%] self-start rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3 text-sm leading-5 text-ink">
                Looking forward to talking.
              </p>
            )}
            <div className="max-w-[84%] self-end">
              <p className="rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-5 text-primary-foreground">
                {compact ? "Good to hear from you." : "Me too."}
              </p>
              <p className="mt-1.5 pr-1 text-right text-[11px] text-muted">
                Read
              </p>
            </div>
          </div>

          <div className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface px-4">
            <span className="flex-1 text-sm text-muted">Write a message…</span>
            <span
              aria-hidden="true"
              className="grid size-7 place-items-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground"
            >
              ↑
            </span>
          </div>
          {compact ? null : (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted">
              <span>Message statuses</span>
              <span className="flex gap-2">
                <span>Sent</span>
                <span>Delivered</span>
                <span>Read</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
