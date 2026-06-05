import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../../assets/logo.png", () => ({ default: "logo.png" }));

const { default: CrmHeader } = await import("./CrmHeader");

const baseProps = (overrides = {}) => ({
  currentUser: {
    firstName: "Jane",
    lastName: "Doe",
    email: "j@e.com",
  },
  activeView: "dashboard",
  setActiveView: vi.fn(),
  isProfileMenuOpen: false,
  theme: "light",
  onToggleTheme: vi.fn(),
  onToggleProfileMenu: vi.fn(),
  onEditProfile: vi.fn(),
  onSignOut: vi.fn(),
  profileMenuRef: { current: null },
  dueLeadsCount: 0,
  onBellClick: vi.fn(),
  onLockedTabClick: vi.fn(),
  ...overrides,
});

describe("CrmHeader", () => {
  it("renders nav items", () => {
    render(<CrmHeader {...baseProps()} />);
    expect(
      screen.getByRole("button", { name: /Dashboard/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /PM Deals/i }),
    ).toBeInTheDocument();
  });

  it("calls setActiveView when a nav item is clicked", () => {
    const setActiveView = vi.fn();
    render(<CrmHeader {...baseProps({ setActiveView })} />);
    fireEvent.click(screen.getByRole("button", { name: /Potential Leads/i }));
    expect(setActiveView).toHaveBeenCalledWith("leads");
  });

  it("renders initial 'J' avatar fallback when no image", () => {
    render(<CrmHeader {...baseProps()} />);
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("uses image avatar when profileImage is set", () => {
    render(
      <CrmHeader
        {...baseProps({
          currentUser: {
            firstName: "Jane",
            lastName: "Doe",
            email: "j@e.com",
            profileImage: "data:image/png;base64,XYZ",
          },
        })}
      />,
    );
    expect(screen.getByAltText(/Jane/i)).toBeInTheDocument();
  });

  it("shows profile menu when open", () => {
    render(<CrmHeader {...baseProps({ isProfileMenuOpen: true })} />);
    expect(
      screen.getByRole("button", { name: /Edit Profile/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sign Out/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("calls onEditProfile / onSignOut from menu items", () => {
    const onEditProfile = vi.fn();
    const onSignOut = vi.fn();
    render(
      <CrmHeader
        {...baseProps({
          isProfileMenuOpen: true,
          onEditProfile,
          onSignOut,
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Edit Profile/i }));
    fireEvent.click(screen.getByRole("button", { name: /Sign Out/i }));
    expect(onEditProfile).toHaveBeenCalled();
    expect(onSignOut).toHaveBeenCalled();
  });

  it("theme toggle calls onToggleTheme", () => {
    const onToggleTheme = vi.fn();
    render(<CrmHeader {...baseProps({ onToggleTheme })} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Switch to dark theme/i }),
    );
    expect(onToggleTheme).toHaveBeenCalled();
  });

  it("bell shows badge when dueLeadsCount > 0", () => {
    render(<CrmHeader {...baseProps({ dueLeadsCount: 3 })} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("bell does not show badge when count is 0", () => {
    const { container } = render(<CrmHeader {...baseProps()} />);
    expect(container.querySelector(".header-bell-badge")).toBeNull();
  });

  it("falls back to email when no name fields are set", () => {
    render(
      <CrmHeader
        {...baseProps({
          currentUser: { email: "user@e.com" },
          isProfileMenuOpen: true,
        })}
      />,
    );
    expect(screen.getAllByText("user@e.com").length).toBeGreaterThan(0);
  });

  it("displays the current prime rate badge", () => {
    render(<CrmHeader {...baseProps()} />);
    expect(screen.getByText("Prime")).toBeInTheDocument();
    expect(screen.getByText(/\d+\.\d{2}%/)).toBeInTheDocument();
  });

  it("prime rate badge has an accessible label", () => {
    render(<CrmHeader {...baseProps()} />);
    expect(screen.getByLabelText(/Prime rate \d+\.?\d*%/i)).toBeInTheDocument();
  });
});
