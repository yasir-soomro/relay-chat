"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RelayIcon, type RelayIconName } from "@/components/ui/relay-icon";
import { useConnections } from "@/features/connections/providers/connections-provider";
import { useNotifications } from "@/features/notifications/providers/notifications-provider";

type WorkspaceNavigationItem = {
  href: string;
  icon: RelayIconName;
  label: string;
};

const primaryItems: WorkspaceNavigationItem[] = [
  { href: "/discover", icon: "discover", label: "Discover people" },
  { href: "/app/connections", icon: "request", label: "Requests" },
  { href: "/conversations", icon: "messages", label: "Messages" },
  { href: "/app/profile", icon: "profile", label: "My profile" },
];

const secondaryItems: WorkspaceNavigationItem[] = [
  { href: "/notifications", icon: "notification", label: "Notifications" },
];

function isCurrentRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLink({
  badge,
  href,
  icon,
  label,
  pathname,
}: WorkspaceNavigationItem & {
  badge?: number;
  pathname: string;
}) {
  const isActive = isCurrentRoute(pathname, href);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      aria-label={
        badge
          ? `${label}, ${badge} ${label === "Requests" ? "pending requests" : "unread messages"}`
          : undefined
      }
      className={`workspace-nav-link flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-focus ${
        isActive
          ? "bg-secondary text-secondary-foreground"
          : "text-muted hover:bg-soft hover:text-ink"
      }`}
      href={href}
    >
      <RelayIcon className="size-5 shrink-0" name={icon} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? (
        <span
          aria-hidden="true"
          className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-soft px-2 py-1 text-xs font-semibold text-muted"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

export function WorkspaceNavigation() {
  const pathname = usePathname();
  const { incoming, isLoading: connectionsLoading, error: connectionsError } =
    useConnections();
  const { unreadCount } = useNotifications();
  const pendingRequestCount =
    !connectionsLoading && !connectionsError ? incoming.length : 0;

  return (
    <nav aria-label="Workspace navigation" className="min-w-0">
      <ul className="space-y-1">
        {primaryItems.map((item) => (
          <li key={item.href}>
            <NavigationLink
              badge={
                item.label === "Requests"
                  ? pendingRequestCount
                  : item.label === "Messages"
                    ? unreadCount
                    : undefined
              }
              {...item}
              pathname={pathname}
            />
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          More
        </p>
        <ul className="space-y-1">
          {secondaryItems.map((item) => (
            <li key={item.href}>
              <NavigationLink {...item} pathname={pathname} />
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
