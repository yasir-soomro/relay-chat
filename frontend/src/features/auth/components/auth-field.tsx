import type { InputHTMLAttributes, ReactNode } from "react";
import { formControlClassName } from "@/components/ui/form-control";

type AuthFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "id"
> & {
  error?: string;
  hint?: string;
  id: string;
  label: string;
  trailing?: ReactNode;
};

export function AuthField({
  autoComplete,
  error,
  hint,
  id,
  label,
  trailing,
  ...inputProps
}: AuthFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [
    hint ? hintId : undefined,
    error ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-ink" htmlFor={id}>
          {label}
        </label>
        {trailing}
      </div>
      <input
        {...inputProps}
        aria-describedby={describedBy || undefined}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        className={formControlClassName}
        id={id}
      />
      {hint ? (
        <p className="text-xs leading-5 text-muted" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-[#9f342a]" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
