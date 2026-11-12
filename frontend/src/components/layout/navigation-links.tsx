"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SiteNavigationItem } from "@/types/site";
import { useOptionalNotifications } from "@/features/notifications/providers/notifications-provider";

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
  const { unreadCount } = useOptionalNotifications();

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
            aria-label={
              item.href === "/notifications" && unreadCount > 0
                ? `${item.label}, ${unreadCount} unread messages`
                : undefined
            }
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
            <span className="flex items-center justify-between gap-3">
              {item.label}
              {item.href === "/notifications" && unreadCount > 0 ? (
                <span
                  aria-hidden="true"
                  className="inline-flex min-w-5 items-center justify-center rounded-full bg-moss px-1.5 py-0.5 text-xs font-semibold text-white"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
