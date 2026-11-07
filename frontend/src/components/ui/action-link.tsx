import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";

type ActionLinkProps = {
  children: ReactNode;
  className?: string;
  href: LinkProps["href"];
  variant?: "primary" | "secondary";
};

const variants = {
  primary:
    "bg-ink text-white hover:bg-moss focus-visible:outline-moss",
  secondary:
    "border border-line bg-surface text-ink hover:border-moss hover:bg-soft",
} as const;

export function ActionLink({
  children,
  className = "",
  href,
  variant = "primary",
}: ActionLinkProps) {
  return (
    <Link
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors ${variants[variant]} ${className}`}
      href={href}
    >
      {children}
    </Link>
  );
}
