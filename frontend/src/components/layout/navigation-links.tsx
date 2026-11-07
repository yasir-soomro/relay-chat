"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SiteNavigationItem } from "@/types/site";

type NavigationLinksProps = {
  currentHref?: string;
  direction?: "horizontal" | "vertical";
  items: readonly SiteNavigationItem[];
};

export function NavigationLinks({
  currentHref,
  direction = "horizontal",
  items,
}: NavigationLinksProps) {
  const pathname = usePathname();
  const activeHref = currentHref ?? pathname;

  return (
    <ul
      className={
        direction === "vertical"
          ? "flex flex-col gap-1"
          : "flex flex-col gap-1 md:flex-row md:items-center md:gap-8"
      }
    >
      {items.map((item) => (
        <li key={item.href}>
          <Link
            aria-current={item.href === activeHref ? "page" : undefined}
            className={`block rounded-lg px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-moss ${
              item.href === activeHref
                ? "bg-soft text-ink"
                : "text-muted hover:bg-soft hover:text-ink"
            } ${
              direction === "horizontal"
                ? "md:px-0 md:py-2 md:hover:bg-transparent"
                : ""
            }`}
            href={item.href}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
