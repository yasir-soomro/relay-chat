export function ConversationPreview() {
  return (
    <div
      aria-label="Illustration of a private conversation"
      className="relative mx-auto w-full max-w-lg"
      role="img"
    >
      <div
        aria-hidden="true"
        className="absolute -left-7 top-16 size-20 rounded-full bg-accent/70 blur-2xl sm:-left-10 sm:size-28"
      />
      <div
        aria-hidden="true"
        className="absolute -right-4 bottom-12 size-24 rounded-full bg-[#dbe8cd] blur-2xl sm:-right-8 sm:size-36"
      />

      <div className="relative rounded-[2rem] border border-white/80 bg-white/80 p-3 shadow-card backdrop-blur sm:rotate-[2deg] sm:p-4">
        <div className="rounded-[1.5rem] bg-canvas p-5 sm:p-7">
          <div className="flex items-center justify-between border-b border-line pb-5">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-full bg-[#d9e8d4] text-sm font-semibold text-moss">
                J
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Just between us</p>
                <p className="mt-1 text-xs text-muted">A space for your people</p>
              </div>
            </div>
            <span
              aria-hidden="true"
              className="flex gap-1"
            >
              <span className="size-1 rounded-full bg-muted/50" />
              <span className="size-1 rounded-full bg-muted/50" />
              <span className="size-1 rounded-full bg-muted/50" />
            </span>
          </div>

          <div className="flex min-h-64 flex-col justify-end gap-3 py-6 sm:min-h-72">
            <p className="max-w-[82%] self-start rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-ink shadow-sm">
              Saving you a seat by the window.
            </p>
            <p className="max-w-[82%] self-end rounded-2xl rounded-br-md bg-moss px-4 py-3 text-sm leading-6 text-white">
              Already looking forward to it.
            </p>
            <p className="max-w-[82%] self-start rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-ink shadow-sm">
              Me too. See you soon!
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-line bg-white px-4 py-3">
            <span className="flex-1 text-sm text-muted">Write something kind...</span>
            <span className="grid size-8 place-items-center rounded-full bg-accent text-[10px] font-semibold text-ink">
              Send
            </span>
          </div>
        </div>
      </div>

      <div className="motion-pop absolute -bottom-5 -left-1 flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-card sm:-left-8">
        <span className="grid size-9 place-items-center rounded-full bg-soft text-moss">
          <span
            aria-hidden="true"
            className="size-2 rotate-45 border-b-2 border-r-2 border-moss"
          />
        </span>
        <span className="text-xs font-medium leading-5 text-ink">
          Here when you&apos;re<br />ready to reconnect
        </span>
      </div>
    </div>
  );
}
