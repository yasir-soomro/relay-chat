import type { HTMLAttributes } from "react";

export const surfaceCardClassName =
  "rounded-card border border-line bg-surface shadow-card";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`${surfaceCardClassName} ${className}`.trim()}
      {...props}
    />
  );
}
