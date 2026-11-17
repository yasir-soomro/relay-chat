import type { SiteNavigationItem } from "@/types/site";

export const siteNavigation = [
  { href: "/how-it-works", icon: "steps", label: "How it works" },
  { href: "/why-relay", icon: "why-relay", label: "Why Relay" },
  { href: "/faqs", icon: "faq", label: "FAQs" },
  { href: "/login", icon: "sign-in", label: "Sign in" },
  { href: "/register", icon: "create-account", label: "Create account" },
] as const satisfies readonly SiteNavigationItem[];

export const appNavigation = [
  { href: "/conversations", icon: "messages", label: "Conversations" },
  { href: "/notifications", icon: "notification", label: "Notifications" },
  { href: "/discover", icon: "discover", label: "Discover" },
  { href: "/app/connections", icon: "request", label: "Connections" },
  { href: "/app/profile", icon: "profile", label: "Profile" },
] as const satisfies readonly SiteNavigationItem[];
