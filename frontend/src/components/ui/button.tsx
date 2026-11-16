import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet" | "destructive";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary:
    "border border-line bg-secondary text-secondary-foreground hover:border-focus hover:bg-soft",
  quiet:
    "border border-transparent text-muted hover:bg-soft hover:text-ink",
  destructive:
    "border border-transparent bg-danger text-danger-foreground hover:brightness-90",
};

const baseClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0";

export function buttonClassName(
  variant: ButtonVariant = "primary",
  className = "",
) {
  return `${baseClassName} ${buttonVariants[variant]} ${className}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: ButtonVariant;
};

export function Button({
  className = "",
  children,
  disabled,
  loading = false,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      aria-busy={loading || props["aria-busy"]}
      className={buttonClassName(variant, className)}
      disabled={disabled || loading}
    >
      {loading ? <span aria-hidden="true" className="ui-spinner" /> : null}
      {children}
    </button>
  );
}
