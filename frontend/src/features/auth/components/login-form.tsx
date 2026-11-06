"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthField } from "@/features/auth/components/auth-field";
import {
  AuthenticationRequestError,
  login,
} from "@/features/auth/api";
import { PasswordField } from "@/features/auth/components/password-field";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { validateLogin } from "@/features/auth/schemas";
import type { FieldErrors } from "@/features/auth/types";

export function LoginForm() {
  const { setAccessToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof FieldErrors, value: string) {
    if (field === "email") {
      setEmail(value);
    } else {
      setPassword(value);
    }

    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError("");
    setSuccess(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccess(false);

    const errors = validateLogin({ email, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login({ email, password });
      setAccessToken(result.access_token);
      setPassword("");
      setSuccess(true);
    } catch (error) {
      if (error instanceof AuthenticationRequestError) {
        setFormError(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setFormError("We could not complete your request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      aria-busy={isSubmitting}
      className="space-y-5"
      noValidate
      onSubmit={handleSubmit}
    >
      <AuthField
        autoComplete="email"
        disabled={isSubmitting}
        error={fieldErrors.email}
        id="login-email"
        label="Email"
        maxLength={254}
        name="email"
        onChange={(event) => updateField("email", event.target.value)}
        placeholder="you@example.com"
        required
        type="email"
        value={email}
      />
      <PasswordField
        autoComplete="current-password"
        disabled={isSubmitting}
        error={fieldErrors.password}
        hint="Use the password you set up for Relay."
        id="login-password"
        onChange={(value) => updateField("password", value)}
        value={password}
      />

      {formError ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-[#efd2cc] bg-[#fff7f5] px-4 py-3 text-sm leading-6 text-[#8e3027]"
          role="alert"
        >
          {formError}
        </p>
      ) : null}
      {success ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-line bg-soft px-4 py-3 text-sm leading-6 text-moss"
          role="status"
        >
          You&apos;re signed in. Your session is available for this visit.
        </p>
      ) : null}

      <button
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-moss focus-visible:outline-moss disabled:cursor-wait disabled:opacity-70"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-sm text-muted">
        New to Relay?{" "}
        <Link
          className="rounded-sm font-semibold text-moss underline-offset-4 transition-colors hover:text-ink hover:underline"
          href="/register"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
