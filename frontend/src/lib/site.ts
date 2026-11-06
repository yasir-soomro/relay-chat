import type { SiteNavigationItem } from "@/types/site";

export const siteNavigation = [
  { href: "/#principles", label: "Our approach" },
  { href: "/#privacy", label: "Privacy" },
] as const satisfies readonly SiteNavigationItem[];

export const appNavigation = [
  { href: "/app", label: "Overview" },
] as const satisfies readonly SiteNavigationItem[];
