import type { SiteNavigationItem } from "@/types/site";

export const siteNavigation = [
  { href: "/#principles", label: "Our approach" },
  { href: "/#privacy", label: "Privacy" },
  { href: "/login", label: "Sign in" },
  { href: "/register", label: "Create account" },
] as const satisfies readonly SiteNavigationItem[];

export const appNavigation = [
  { href: "/app", label: "Overview" },
  { href: "/conversations", label: "Conversations" },
  { href: "/notifications", label: "Notifications" },
  { href: "/discover", label: "Discover" },
  { href: "/app/connections", label: "Connections" },
  { href: "/app/profile", label: "Profile" },
] as const satisfies readonly SiteNavigationItem[];
