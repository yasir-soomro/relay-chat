import type { ReactNode } from "react";

type DropdownProps = {
  children: ReactNode;
  trigger: ReactNode;
};

export function Dropdown({ children, trigger }: DropdownProps) {
  return (
    <details className="group relative inline-block">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
        {trigger}
        <svg
          aria-hidden="true"
          className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="m7 10 5 5 5-5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </summary>
      <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 min-w-48 rounded-card border border-line bg-surface p-2 text-ink shadow-card">
        {children}
      </div>
    </details>
  );
}
