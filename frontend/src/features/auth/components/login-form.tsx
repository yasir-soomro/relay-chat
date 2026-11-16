"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AuthField } from "@/features/auth/components/auth-field";
import { Button } from "@/components/ui/button";
import { AuthenticationRequestError } from "@/features/auth/api";
import { PasswordField } from "@/features/auth/components/password-field";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { validateLogin } from "@/features/auth/schemas";
import type { FieldErrors } from "@/features/auth/types";
import { RelayIcon } from "@/components/ui/relay-icon";

export function LoginForm() {
  const { signIn, status, error: authError } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loginRequested = useRef(false);

  useEffect(() => {
    if (status === "authenticated" && !loginRequested.current) {
      router.replace("/app");
    }
  }, [router, status]);

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

    loginRequested.current = true;
    setIsSubmitting(true);
    try {
      await signIn({ email, password });
      setPassword("");
      setSuccess(true);
      const requestedPath = new URLSearchParams(window.location.search).get(
        "next",
      );
      const redirectTarget = requestedPath
        ? new URL(requestedPath, window.location.origin)
        : null;
      const nextPath =
        redirectTarget?.origin === window.location.origin &&
        requestedPath?.startsWith("/") &&
        !requestedPath.startsWith("//")
          ? `${redirectTarget.pathname}${redirectTarget.search}${redirectTarget.hash}`
          : "/app";
      router.replace(nextPath);
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
      className="login-form space-y-5"
      noValidate
      onSubmit={handleSubmit}
    >
      <AuthField
        autoComplete="email"
        disabled={isSubmitting}
        error={fieldErrors.email}
        id="login-email"
        label="Email address"
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
        id="login-password"
        onChange={(value) => updateField("password", value)}
        togglePresentation="icon"
        value={password}
      />

      {formError || authError ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm leading-6 text-danger"
          role="alert"
        >
          {formError || authError}
        </p>
      ) : null}
      {success ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-line bg-soft px-4 py-3 text-sm leading-6 text-primary"
          role="status"
        >
          You&apos;re signed in. Your session is available for this visit.
        </p>
      ) : null}

      <Button
        className="w-full"
        disabled={isSubmitting}
        loading={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          "Signing in..."
        ) : (
          <>
            Sign in
            <RelayIcon className="size-4" name="arrow-right" />
          </>
        )}
      </Button>
    </form>
  );
}
