import type { HTMLAttributes } from "react";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-soft text-ink",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({
  className = "",
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-caption font-semibold ${toneClasses[tone]} ${className}`.trim()}
      {...props}
    />
  );
}
