import { NavigationLinks } from "@/components/layout/navigation-links";
import type { SiteNavigationItem } from "@/types/site";

type MobileNavigationProps = {
  ariaLabel: string;
  items: readonly SiteNavigationItem[];
};

export function MobileNavigation({
  ariaLabel,
  items,
}: MobileNavigationProps) {
  return (
    <details className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-soft focus-visible:outline-moss [&::-webkit-details-marker]:hidden">
        Menu
        <span aria-hidden="true" className="grid gap-1">
          <span className="h-px w-3 bg-current transition-transform group-open:translate-y-[3px] group-open:rotate-45" />
          <span className="h-px w-3 bg-current transition-transform group-open:-translate-y-[3px] group-open:-rotate-45" />
        </span>
      </summary>
      <nav
        aria-label={ariaLabel}
        className="absolute right-0 top-[calc(100%+0.75rem)] z-20 min-w-48 rounded-2xl border border-line bg-surface p-2 shadow-card"
      >
        <NavigationLinks direction="vertical" items={items} />
      </nav>
    </details>
  );
}
