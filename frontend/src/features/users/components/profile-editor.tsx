"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { surfaceCardClassName } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { ProfileAvatar } from "@/features/users/components/profile-avatar";
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
  onValuesChange?: () => void;
};

export function ProfileEditor({
  initialValues,
  onCancel,
  onSave,
  onSaved,
  onValuesChange,
}: ProfileEditorProps) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isDirty =
    values.username !== initialValues.username ||
    values.display_name !== initialValues.display_name ||
    values.bio !== initialValues.bio;

  function updateField<Field extends keyof UserProfileValues>(
    field: Field,
    value: UserProfileValues[Field],
  ) {
    onValuesChange?.();
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError("");
  }

  function handleCancel() {
    setValues(initialValues);
    setFieldErrors({});
    setFormError("");
    onCancel();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const errors = validateUserProfile(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    try {
      onSaved(await onSave(values));
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

  const previewName = values.display_name.trim() || "Your name";
  const previewUsername = values.username.trim() || "username";

  return (
    <div className="profile-editor-grid mt-6 grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,0.85fr)]">
      <form
        aria-busy={isSaving}
        className={`${surfaceCardClassName} profile-editor-card min-w-0 p-4 sm:p-5`}
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="profile-editor-header flex min-w-0 items-center gap-3 pb-2">
          <ProfileAvatar
            displayName={previewName}
            size="small"
            username={previewUsername}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Profile details</p>
            <p className="mt-0.5 text-xs text-muted">
              Update how people see you on Relay
            </p>
          </div>
          <span
            className={`profile-editor-status shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              isDirty
                ? "profile-editor-status-dirty bg-warning-soft text-warning"
                : "profile-editor-status-saved bg-success-soft text-success"
            }`}
            role="status"
          >
            {isDirty ? "Unsaved changes" : "Up to date"}
          </span>
        </div>

        <div className="profile-editor-fields mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
          <div className="profile-editor-field min-w-0 space-y-1.5">
            <label className="text-xs font-semibold text-ink" htmlFor="profile-display-name">
              Full name
            </label>
            <Input
              aria-describedby={fieldError("display_name")}
              aria-invalid={Boolean(fieldErrors.display_name)}
              autoComplete="name"
              className="profile-editor-input"
              disabled={isSaving}
              id="profile-display-name"
              maxLength={50}
              name="display_name"
              onChange={(event) => updateField("display_name", event.target.value)}
              required
              value={values.display_name}
            />
            {fieldErrors.display_name ? (
              <p className="text-xs text-danger" id="display_name-error">
                {fieldErrors.display_name}
              </p>
            ) : null}
          </div>

          <div className="profile-editor-field min-w-0 space-y-1.5">
            <label className="text-xs font-semibold text-ink" htmlFor="profile-username">
              Username
            </label>
            <Input
              aria-describedby={fieldError("username")}
              aria-invalid={Boolean(fieldErrors.username)}
              autoComplete="username"
              className="profile-editor-input"
              disabled={isSaving}
              id="profile-username"
              maxLength={30}
              minLength={3}
              name="username"
              onChange={(event) => updateField("username", event.target.value)}
              required
              value={values.username}
            />
            {fieldErrors.username ? (
              <p className="text-xs text-danger" id="username-error">
                {fieldErrors.username}
              </p>
            ) : null}
          </div>
        </div>

        <div className="profile-editor-field mt-4 space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-semibold text-ink" htmlFor="profile-bio">
              Bio
            </label>
            <span className="text-[11px] text-muted" id="profile-bio-count">
              {values.bio.length} / 160
            </span>
          </div>
          <Textarea
            aria-describedby={`profile-bio-count${fieldError("bio") ? " bio-error" : ""}`}
            aria-invalid={Boolean(fieldErrors.bio)}
            className="profile-editor-input min-h-28 resize-y"
            disabled={isSaving}
            id="profile-bio"
            maxLength={160}
            name="bio"
            onChange={(event) => updateField("bio", event.target.value)}
            value={values.bio}
          />
          {fieldErrors.bio ? (
            <p className="text-xs text-danger" id="bio-error">
              {fieldErrors.bio}
            </p>
          ) : null}
        </div>

        {formError ? (
          <p
            aria-live="polite"
            className="profile-editor-error mt-4 rounded-xl bg-danger-soft px-3 py-2.5 text-xs leading-5 text-danger"
            role="alert"
          >
            {formError}
          </p>
        ) : null}

        <div className="profile-editor-actions mt-5 flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            className="min-h-9 rounded-lg px-4 py-2 text-xs"
            disabled={isSaving}
            onClick={handleCancel}
            type="button"
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            className="min-h-9 rounded-lg px-4 py-2 text-xs"
            disabled={isSaving || !isDirty}
            loading={isSaving}
            type="submit"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>

      <aside
        aria-label="Public profile preview"
        className={`${surfaceCardClassName} profile-preview-card min-w-0 p-4 sm:p-5`}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
          Public profile preview
        </p>
        <div className="mt-5 flex flex-col items-start">
          <ProfileAvatar
            displayName={previewName}
            size="large"
            username={previewUsername}
          />
          <h2 className="mt-4 break-words text-lg font-semibold text-ink">
            {previewName}
          </h2>
          <p className="mt-0.5 break-all text-xs font-medium text-primary">
            @{previewUsername}
          </p>
          <p className="mt-4 whitespace-pre-wrap break-words text-xs leading-5 text-muted">
            {values.bio.trim() || "A short introduction will appear here."}
          </p>
        </div>
        <p className="mt-5 pt-1 text-[11px] leading-5 text-muted">
          This is how others will see you.
        </p>
      </aside>
    </div>
  );
}
