import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const signInUser = vi.fn();
const sendPasswordResetOtp = vi.fn();
const confirmPasswordReset = vi.fn();
const createUserAccount = vi.fn();
const activateUserAccount = vi.fn();

vi.mock("../../firebase/firestoreService", () => ({
  signInUser: (...args) => signInUser(...args),
  sendPasswordResetOtp: (...args) => sendPasswordResetOtp(...args),
  confirmPasswordReset: (...args) => confirmPasswordReset(...args),
  createUserAccount: (...args) => createUserAccount(...args),
  activateUserAccount: (...args) => activateUserAccount(...args),
}));

const { default: AuthGate } = await import("./AuthGate");

beforeEach(() => {
  signInUser.mockReset();
  sendPasswordResetOtp.mockReset();
  confirmPasswordReset.mockReset();
  createUserAccount.mockReset();
  activateUserAccount.mockReset();
  window.history.replaceState({}, "", "/");
});

describe("AuthGate", () => {
  it("renders the sign-in form by default", () => {
    render(<AuthGate onAuthenticated={vi.fn()} />);
    expect(screen.getByText(/Sign in to your CRM/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  it("calls signInUser and onAuthenticated on successful login", async () => {
    signInUser.mockResolvedValue({ id: "u1", email: "u@e.com" });
    const onAuthenticated = vi.fn();
    render(<AuthGate onAuthenticated={onAuthenticated} />);
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "jane" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));
    await waitFor(() =>
      expect(onAuthenticated).toHaveBeenCalledWith(
        expect.objectContaining({ id: "u1" }),
      ),
    );
  });

  it("shows error message on sign-in failure", async () => {
    signInUser.mockRejectedValue(new Error("Bad credentials"));
    render(<AuthGate onAuthenticated={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "jane" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));
    expect(await screen.findByText(/Bad credentials/i)).toBeInTheDocument();
  });

  it("switches to forgot-password view", () => {
    render(<AuthGate onAuthenticated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Forgot password/i }));
    expect(screen.getByText(/Reset password/i)).toBeInTheDocument();
  });

  it("creates a PPC account and asks the user to activate by email", async () => {
    createUserAccount.mockResolvedValue({ id: "u2" });
    render(<AuthGate onAuthenticated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Create account/i }));

    fireEvent.change(screen.getByPlaceholderText("First name"), {
      target: { value: "Perry" },
    });
    fireEvent.change(screen.getByPlaceholderText("Last name"), {
      target: { value: "PPC" },
    });
    fireEvent.change(screen.getByPlaceholderText("Username"), {
      target: { value: "perry" },
    });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "perry@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.change(screen.getByPlaceholderText("Repeat password"), {
      target: { value: "secret" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() =>
      expect(createUserAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "perry@example.com",
          username: "perry",
        }),
      ),
    );
    expect(
      await screen.findByText(/Activation email sent/i),
    ).toBeInTheDocument();
  });

  it("activates an account from an activation link", async () => {
    activateUserAccount.mockResolvedValue(undefined);
    window.history.replaceState({}, "", "/?activate=token-123");

    render(<AuthGate onAuthenticated={vi.fn()} />);

    await waitFor(() =>
      expect(activateUserAccount).toHaveBeenCalledWith("token-123"),
    );
    expect(await screen.findByText(/Account activated/i)).toBeInTheDocument();
  });

  it("sends OTP and progresses to reset step", async () => {
    sendPasswordResetOtp.mockResolvedValue(undefined);
    render(<AuthGate onAuthenticated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Forgot password/i }));
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "u@e.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Code/i }));
    await waitFor(() =>
      expect(sendPasswordResetOtp).toHaveBeenCalledWith("u@e.com"),
    );
    expect(await screen.findByText(/Enter new password/i)).toBeInTheDocument();
  });

  it("blocks password reset when passwords do not match", async () => {
    sendPasswordResetOtp.mockResolvedValue(undefined);
    render(<AuthGate onAuthenticated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Forgot password/i }));
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "u@e.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Code/i }));
    await screen.findByText(/Enter new password/i);
    fireEvent.change(screen.getByPlaceholderText("123456"), {
      target: { value: "111111" },
    });
    fireEvent.change(screen.getByPlaceholderText("New password"), {
      target: { value: "abcd" },
    });
    fireEvent.change(screen.getByPlaceholderText("Repeat new password"), {
      target: { value: "different" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Set New Password/i }));
    expect(
      await screen.findByText(/Passwords do not match/i),
    ).toBeInTheDocument();
    expect(confirmPasswordReset).not.toHaveBeenCalled();
  });
});
