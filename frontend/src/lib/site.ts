import type { SiteNavigationItem } from "@/types/site";

export const siteNavigation = [
  { href: "/#principles", label: "Our approach" },
  { href: "/#privacy", label: "Privacy" },
  { href: "/login", label: "Sign in" },
  { href: "/register", label: "Create account" },
] as const satisfies readonly SiteNavigationItem[];

export const appNavigation = [
  { href: "/app", label: "Overview" },
  { href: "/app/profile", label: "Profile" },
] as const satisfies readonly SiteNavigationItem[];
