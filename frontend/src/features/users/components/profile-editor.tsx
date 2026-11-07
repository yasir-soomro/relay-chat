"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { surfaceCardClassName } from "@/components/ui/card";
import { formControlClassName } from "@/components/ui/form-control";
import { UserRequestError } from "@/features/users/api";
import { validateUserProfile } from "@/features/users/schemas";
import type {
  ProfileFieldErrors,
  UserAccountProfile,
  UserProfileValues,
} from "@/features/users/types";

type ProfileEditorProps = {
  initialValues: UserProfileValues;
  onCancel: () => void;
  onSave: (values: UserProfileValues) => Promise<UserAccountProfile>;
  onSaved: (profile: UserAccountProfile) => void;
};

export function ProfileEditor({
  initialValues,
  onCancel,
  onSave,
  onSaved,
}: ProfileEditorProps) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updateField<Field extends keyof UserProfileValues>(
    field: Field,
    value: UserProfileValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const errors = validateUserProfile(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSaving(true);
    try {
      const profile = await onSave(values);
      onSaved(profile);
    } catch (error) {
      if (error instanceof UserRequestError) {
        setFormError(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setFormError(
          error instanceof Error
            ? error.message
            : "We could not save your profile. Please try again.",
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  function fieldError(field: keyof UserProfileValues) {
    return fieldErrors[field] ? `${field}-error` : undefined;
  }

  return (
    <form
      aria-busy={isSaving}
      className={`space-y-5 ${surfaceCardClassName} p-6 sm:p-8`}
      noValidate
      onSubmit={handleSubmit}
    >
      <div>
        <h2 className="text-xl font-semibold text-ink">Edit your profile</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Update the details other Relay members can see.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-ink" htmlFor="profile-display-name">
          Display name
        </label>
        <input
          aria-describedby={fieldError("display_name")}
          aria-invalid={Boolean(fieldErrors.display_name)}
          autoComplete="name"
          className={formControlClassName}
          disabled={isSaving}
          id="profile-display-name"
          maxLength={50}
          name="display_name"
          onChange={(event) => updateField("display_name", event.target.value)}
          required
          value={values.display_name}
        />
        {fieldErrors.display_name ? (
          <p className="text-sm text-[#9f342a]" id="display_name-error">
            {fieldErrors.display_name}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-ink" htmlFor="profile-username">
          Username
        </label>
        <input
          aria-describedby={fieldError("username")}
          aria-invalid={Boolean(fieldErrors.username)}
          autoComplete="username"
          className={formControlClassName}
          disabled={isSaving}
          id="profile-username"
          maxLength={30}
          minLength={3}
          name="username"
          onChange={(event) => updateField("username", event.target.value)}
          required
          value={values.username}
        />
        <p className="text-xs leading-5 text-muted">
          3–30 lowercase letters, numbers, or underscores.
        </p>
        {fieldErrors.username ? (
          <p className="text-sm text-[#9f342a]" id="username-error">
            {fieldErrors.username}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-ink" htmlFor="profile-bio">
            Bio
          </label>
          <span className="text-xs text-muted" id="profile-bio-count">
            {values.bio.length}/160
          </span>
        </div>
        <textarea
          aria-describedby={`profile-bio-count${fieldError("bio") ? " bio-error" : ""}`}
          aria-invalid={Boolean(fieldErrors.bio)}
          className={`${formControlClassName} min-h-32 resize-y`}
          disabled={isSaving}
          id="profile-bio"
          maxLength={160}
          name="bio"
          onChange={(event) => updateField("bio", event.target.value)}
          value={values.bio}
        />
        {fieldErrors.bio ? (
          <p className="text-sm text-[#9f342a]" id="bio-error">
            {fieldErrors.bio}
          </p>
        ) : null}
      </div>

      {formError ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-[#efd2cc] bg-[#fff7f5] px-4 py-3 text-sm leading-6 text-[#8e3027]"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
        <Button
          disabled={isSaving}
          onClick={onCancel}
          type="button"
          variant="secondary"
        >
          Cancel
        </Button>
        <Button
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
