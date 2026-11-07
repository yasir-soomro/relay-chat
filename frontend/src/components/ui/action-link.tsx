import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";
import { buttonClassName } from "@/components/ui/button";

type ActionLinkProps = {
  children: ReactNode;
  className?: string;
  href: LinkProps["href"];
  variant?: "primary" | "secondary";
};

export function ActionLink({
  children,
  className = "",
  href,
  variant = "primary",
}: ActionLinkProps) {
  return (
    <Link
      className={buttonClassName(variant, className)}
      href={href}
    >
      {children}
    </Link>
  );
}
