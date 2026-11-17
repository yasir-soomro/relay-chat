import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileEditor } from "@/features/users/components/profile-editor";
import { UserRequestError } from "@/features/users/api";
import type { UserAccountProfile } from "@/features/users/types";

const accountProfile: UserAccountProfile = {
  id: "c01d6ec5-e1a5-4bdb-93a4-4c932a1e0f15",
  email: "private@example.com",
  username: "relay_user",
  display_name: "Relay User",
  bio: null,
  created_at: "2026-11-07T00:00:00Z",
  updated_at: "2026-11-07T00:00:00Z",
};

const initialValues = {
  username: accountProfile.username,
  display_name: accountProfile.display_name,
  bio: "",
};

describe("ProfileEditor", () => {
  it("validates before submitting and saves valid profile values", async () => {
    const onSave = vi.fn().mockResolvedValue(accountProfile);
    const onSaved = vi.fn();
    render(
      <ProfileEditor
        initialValues={initialValues}
        onCancel={vi.fn()}
        onSave={onSave}
        onSaved={onSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "Not Valid" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      screen.getByText("Use 3–30 lowercase letters, numbers, or underscores."),
    ).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "relay_edited" },
    });
    fireEvent.change(screen.getByLabelText("Bio"), {
      target: { value: "A short bio" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        username: "relay_edited",
        display_name: "Relay User",
        bio: "A short bio",
      });
    });
    expect(onSaved).toHaveBeenCalledWith(accountProfile);
  });

  it("updates the public preview while editing", () => {
    render(
      <ProfileEditor
        initialValues={initialValues}
        onCancel={vi.fn()}
        onSave={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Preview Person" },
    });
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "preview_person" },
    });
    fireEvent.change(screen.getByLabelText("Bio"), {
      target: { value: "Live preview bio" },
    });

    expect(screen.getByRole("complementary", { name: "Public profile preview" })).toBeTruthy();
    expect(screen.getAllByText("Preview Person").length).toBeGreaterThan(0);
    expect(screen.getAllByText("@preview_person").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Live preview bio").length).toBeGreaterThan(0);
  });

  it("shows a username conflict beside its field", async () => {
    const onSave = vi.fn().mockRejectedValue(
      new UserRequestError(
        409,
        "That username is already in use. Choose another username.",
        { username: "That username is already in use." },
      ),
    );
    render(
      <ProfileEditor
        initialValues={initialValues}
        onCancel={vi.fn()}
        onSave={onSave}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "relay_conflict" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      await screen.findByText("That username is already in use."),
    ).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "Choose another username",
    );
  });

  it("disables saving until changed and restores initial values on cancel", () => {
    const onCancel = vi.fn();
    render(
      <ProfileEditor
        initialValues={initialValues}
        onCancel={onCancel}
        onSave={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    const saveButton = screen.getByRole("button", { name: "Save changes" });
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Changed Name" },
    });
    expect((saveButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect((screen.getByLabelText("Full name") as HTMLInputElement).value).toBe(
      "Relay User",
    );
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
