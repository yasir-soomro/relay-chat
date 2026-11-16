import type { HTMLAttributes, ReactNode } from "react";

type ToastTone = "neutral" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<ToastTone, string> = {
  neutral: "border-line bg-surface text-ink",
  success: "border-success/30 bg-success-soft text-success",
  warning: "border-warning/30 bg-warning-soft text-warning",
  danger: "border-danger/30 bg-danger-soft text-danger",
  info: "border-info/30 bg-info-soft text-info",
};

const indicatorClasses: Record<ToastTone, string> = {
  neutral: "bg-muted",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

type ToastProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  title?: string;
  tone?: ToastTone;
};

export function Toast({
  children,
  className = "",
  title,
  tone = "info",
  ...props
}: ToastProps) {
  return (
    <div
      aria-atomic="true"
      aria-live={tone === "danger" ? "assertive" : "polite"}
      className={`flex items-start gap-3 rounded-xl border p-4 shadow-card ${toneClasses[tone]} ${className}`.trim()}
      role={tone === "danger" ? "alert" : "status"}
      {...props}
    >
      <span
        aria-hidden="true"
        className={`mt-1.5 size-2 shrink-0 rounded-full ${indicatorClasses[tone]}`}
      />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? (
          <div className={title ? "mt-1 text-sm leading-5" : "text-sm leading-5"}>
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
