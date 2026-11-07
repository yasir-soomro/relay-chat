"use client";

import { useState } from "react";
import { AuthField } from "@/features/auth/components/auth-field";

type PasswordFieldProps = {
  autoComplete: "current-password" | "new-password";
  disabled?: boolean;
  error?: string;
  hint?: string;
  id: string;
  label?: string;
  maxLength?: number;
  minLength?: number;
  onChange: (value: string) => void;
  value: string;
};

export function PasswordField({
  autoComplete,
  disabled,
  error,
  hint,
  id,
  label = "Password",
  maxLength = 128,
  minLength = 12,
  onChange,
  value,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <AuthField
      autoComplete={autoComplete}
      disabled={disabled}
      error={error}
      hint={hint}
      id={id}
      label={label}
      maxLength={maxLength}
      minLength={minLength}
      name="password"
      onChange={(event) => onChange(event.target.value)}
      required
      trailing={
        <button
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="rounded px-1 text-xs font-semibold text-moss underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:outline-moss"
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? "Hide" : "Show"}
        </button>
      }
      type={visible ? "text" : "password"}
      value={value}
    />
  );
}
