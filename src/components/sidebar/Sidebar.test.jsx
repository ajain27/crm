import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "./Sidebar";

const baseProps = (overrides = {}) => ({
  activeView: "dashboard",
  setActiveView: vi.fn(),
  currentUser: { firstName: "Jane", lastName: "Doe", email: "j@e.com" },
  isOpen: true,
  theme: "light",
  onToggleTheme: vi.fn(),
  ...overrides,
});

describe("Sidebar", () => {
  it("renders all primary nav items", () => {
    render(<Sidebar {...baseProps()} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Buyers List")).toBeInTheDocument();
    expect(screen.getByText("Deal Analyzer")).toBeInTheDocument();
    expect(screen.getByText("Mortgage Calculator")).toBeInTheDocument();
  });

  it("marks the active nav item", () => {
    render(<Sidebar {...baseProps({ activeView: "buyers" })} />);
    expect(screen.getByText("Buyers List").className).toMatch(/active/);
  });

  it("clicking a nav item calls setActiveView", () => {
    const setActiveView = vi.fn();
    render(<Sidebar {...baseProps({ setActiveView })} />);
    fireEvent.click(screen.getByText("Mortgage Calculator"));
    expect(setActiveView).toHaveBeenCalledWith("mortgage");
  });

  it("displays the user's full name in the user card", () => {
    render(<Sidebar {...baseProps()} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("falls back to email when no name fields are set", () => {
    render(<Sidebar {...baseProps({ currentUser: { email: "x@e.com" } })} />);
    expect(screen.getByText("x@e.com")).toBeInTheDocument();
  });

  it("shows initials when no profile image", () => {
    render(<Sidebar {...baseProps()} />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("shows an avatar image when profileImage is set", () => {
    render(
      <Sidebar
        {...baseProps({
          currentUser: {
            firstName: "Jane",
            lastName: "Doe",
            profileImage: "data:image/png;base64,XYZ",
          },
        })}
      />,
    );
    expect(screen.getByRole("img", { name: "Jane Doe" })).toBeInTheDocument();
  });

  it("toggles theme via button", () => {
    const onToggleTheme = vi.fn();
    render(<Sidebar {...baseProps({ onToggleTheme })} />);
    fireEvent.click(screen.getByText(/Dark Theme/i));
    expect(onToggleTheme).toHaveBeenCalled();
  });

  it("shows 'Light Theme' label when current theme is dark", () => {
    render(<Sidebar {...baseProps({ theme: "dark" })} />);
    expect(screen.getByText(/Light Theme/i)).toBeInTheDocument();
  });

  it("respects isOpen=false by applying closed class", () => {
    const { container } = render(<Sidebar {...baseProps({ isOpen: false })} />);
    expect(container.querySelector(".sidebar.closed")).toBeTruthy();
  });
});
