"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthField } from "@/features/auth/components/auth-field";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/features/auth/components/password-field";
import {
  AuthenticationRequestError,
  register,
} from "@/features/auth/api";
import { validateRegistration } from "@/features/auth/schemas";
import type {
  FieldErrors,
  RegistrationValues,
} from "@/features/auth/types";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { RelayIcon } from "@/components/ui/relay-icon";

const emptyValues: RegistrationValues = {
  email: "",
  username: "",
  display_name: "",
  password: "",
};

export function RegistrationForm() {
  const { status } = useAuth();
  const router = useRouter();
  const [values, setValues] = useState(emptyValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/conversations");
    }
  }, [router, status]);

  function updateField<Field extends keyof RegistrationValues>(
    field: Field,
    value: RegistrationValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
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

    const errors = validateRegistration(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register(values);
      setValues(emptyValues);
      setFieldErrors({});
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
      className="registration-form space-y-4"
      noValidate
      onSubmit={handleSubmit}
    >
      <AuthField
        autoComplete="name"
        error={fieldErrors.display_name}
        id="register-display-name"
        hint="This is the name shown on your profile."
        label="Full name"
        maxLength={50}
        name="display_name"
        disabled={isSubmitting}
        onChange={(event) => updateField("display_name", event.target.value)}
        placeholder="Your name"
        required
        type="text"
        value={values.display_name}
      />
      <AuthField
        autoComplete="username"
        disabled={isSubmitting}
        error={fieldErrors.username}
        hint="3–30 lowercase letters, numbers, or underscores."
        id="register-username"
        label="Username"
        maxLength={30}
        minLength={3}
        name="username"
        onChange={(event) => updateField("username", event.target.value)}
        placeholder="your_username"
        required
        type="text"
        value={values.username}
      />
      <AuthField
        autoComplete="email"
        error={fieldErrors.email}
        id="register-email"
        label="Email"
        maxLength={254}
        name="email"
        disabled={isSubmitting}
        onChange={(event) => updateField("email", event.target.value)}
        placeholder="you@example.com"
        required
        type="email"
        value={values.email}
      />
      <PasswordField
        autoComplete="new-password"
        disabled={isSubmitting}
        error={fieldErrors.password}
        hint="Use 12–128 characters."
        id="register-password"
        onChange={(value) => updateField("password", value)}
        togglePresentation="icon"
        value={values.password}
      />

      {formError ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm leading-6 text-danger"
          role="alert"
        >
          {formError}
        </p>
      ) : null}
      {success ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-line bg-soft px-4 py-3 text-sm leading-6 text-primary"
          role="status"
        >
          Your account has been created. You can now{" "}
          <Link className="font-semibold underline underline-offset-4" href="/login">
            sign in
          </Link>
          .
        </p>
      ) : null}

      <Button
        className="w-full"
        disabled={isSubmitting}
        loading={isSubmitting}
        type="submit"
      >
        {isSubmitting ? (
          "Creating account..."
        ) : (
          <>
            Create account
            <RelayIcon className="size-4" name="arrow-right" />
          </>
        )}
      </Button>
    </form>
  );
}
