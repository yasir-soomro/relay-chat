import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-moss",
  secondary: "border border-line bg-surface text-ink hover:border-moss hover:bg-soft",
  quiet: "border border-line text-muted hover:bg-soft hover:text-ink",
};

const baseClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-moss disabled:cursor-not-allowed disabled:opacity-70";

export function buttonClassName(
  variant: ButtonVariant = "primary",
  className = "",
) {
  return `${baseClassName} ${buttonVariants[variant]} ${className}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  return <button className={buttonClassName(variant, className)} {...props} />;
}
