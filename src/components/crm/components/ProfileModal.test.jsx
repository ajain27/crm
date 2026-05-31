import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfileModal from "./ProfileModal";

const baseForm = {
  firstName: "Jane",
  lastName: "Doe",
  profileImage: "",
};

describe("ProfileModal", () => {
  it("renders nothing when isOpen=false", () => {
    const { container } = render(
      <ProfileModal
        currentUser={{}}
        isOpen={false}
        profileForm={baseForm}
        setProfileForm={vi.fn()}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onProfileImageChange={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders title and form fields when open", () => {
    render(
      <ProfileModal
        currentUser={{}}
        isOpen={true}
        profileForm={baseForm}
        setProfileForm={vi.fn()}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onProfileImageChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Edit Profile")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Jane")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
  });

  it("setProfileForm called when typing first name", () => {
    const setProfileForm = vi.fn();
    render(
      <ProfileModal
        currentUser={{}}
        isOpen={true}
        profileForm={baseForm}
        setProfileForm={setProfileForm}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onProfileImageChange={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("Jane"), {
      target: { value: "Alice" },
    });
    expect(setProfileForm).toHaveBeenCalled();
  });

  it("Save button calls onSave", () => {
    const onSave = vi.fn();
    render(
      <ProfileModal
        currentUser={{}}
        isOpen={true}
        profileForm={baseForm}
        setProfileForm={vi.fn()}
        onClose={vi.fn()}
        onSave={onSave}
        onProfileImageChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));
    expect(onSave).toHaveBeenCalled();
  });

  it("Cancel button calls onClose", () => {
    const onClose = vi.fn();
    render(
      <ProfileModal
        currentUser={{}}
        isOpen={true}
        profileForm={baseForm}
        setProfileForm={vi.fn()}
        onClose={onClose}
        onSave={vi.fn()}
        onProfileImageChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows Remove Photo when profileImage is set", () => {
    render(
      <ProfileModal
        currentUser={{}}
        isOpen={true}
        profileForm={{ ...baseForm, profileImage: "data:image/png;base64,XYZ" }}
        setProfileForm={vi.fn()}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onProfileImageChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Remove Photo/i }),
    ).toBeInTheDocument();
  });

  it("Remove Photo clears profileImage via setProfileForm", () => {
    const setProfileForm = vi.fn();
    render(
      <ProfileModal
        currentUser={{}}
        isOpen={true}
        profileForm={{ ...baseForm, profileImage: "data:image/png;base64,XYZ" }}
        setProfileForm={setProfileForm}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onProfileImageChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Remove Photo/i }));
    const reducer = setProfileForm.mock.calls[0][0];
    expect(reducer({ profileImage: "X" })).toMatchObject({ profileImage: "" });
  });
});
