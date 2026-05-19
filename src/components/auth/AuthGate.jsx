import { useState } from "react";
import {
  signInUser,
  sendPasswordResetOtp,
  confirmPasswordReset,
} from "../../firebase/firestoreService";

function AuthGate({ onAuthenticated }) {
  const [view, setView] = useState("login"); // "login" | "forgot" | "reset"
  const [form, setForm] = useState({ email: "", password: "" });
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function goToLogin() {
    setView("login");
    setErrorMessage("");
    setSuccessMessage("");
    setResetOtp("");
    setResetPassword("");
    setResetConfirm("");
  }

  async function handleSignIn(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const user = await signInUser({
        email: form.email,
        password: form.password,
      });
      setForm({ email: "", password: "" });
      onAuthenticated(user);
    } catch (error) {
      setErrorMessage(error.message || "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendOtp(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      await sendPasswordResetOtp(resetEmail);
      setView("reset");
      setSuccessMessage(
        `If ${resetEmail} is registered, a 6-digit code was sent. Check your inbox.`,
      );
    } catch (error) {
      setErrorMessage(error.message || "Could not send reset code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setErrorMessage("");
    if (resetPassword !== resetConfirm) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (resetPassword.length < 4) {
      setErrorMessage("Password must be at least 4 characters.");
      return;
    }
    setIsSubmitting(true);
    try {
      await confirmPasswordReset(resetEmail, resetOtp, resetPassword);
      goToLogin();
      setSuccessMessage("Password updated. You can now sign in.");
    } catch (error) {
      setErrorMessage(error.message || "Could not reset password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        {view === "login" && (
          <>
            <div className="auth-copy">
              <h1>Sign in to your CRM</h1>
              <p>Access your deals, buyers, and notes.</p>
            </div>

            {successMessage && (
              <div className="auth-success">{successMessage}</div>
            )}

            <form className="auth-form" onSubmit={handleSignIn}>
              <label className="auth-field">
                <span>Email</span>
                <input
                  required
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                />
              </label>

              <label className="auth-field">
                <span>Password</span>
                <input
                  required
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Password"
                />
              </label>

              {errorMessage && <div className="auth-error">{errorMessage}</div>}

              <button
                className="primary-btn auth-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Please wait..." : "Sign In"}
              </button>
            </form>

            <button
              className="auth-forgot-link"
              onClick={() => {
                setErrorMessage("");
                setSuccessMessage("");
                setView("forgot");
              }}
            >
              Forgot password?
            </button>
          </>
        )}

        {view === "forgot" && (
          <>
            <div className="auth-copy">
              <h1>Reset password</h1>
              <p>
                Enter your account email and we&apos;ll send you a reset code.
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSendOtp}>
              <label className="auth-field">
                <span>Email</span>
                <input
                  required
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>

              {errorMessage && <div className="auth-error">{errorMessage}</div>}

              <button
                className="primary-btn auth-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send Code"}
              </button>
            </form>

            <button className="auth-forgot-link" onClick={goToLogin}>
              ← Back to sign in
            </button>
          </>
        )}

        {view === "reset" && (
          <>
            <div className="auth-copy">
              <h1>Enter new password</h1>
              <p>{successMessage}</p>
            </div>

            <form className="auth-form" onSubmit={handleResetPassword}>
              <label className="auth-field">
                <span>6-digit code</span>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={resetOtp}
                  onChange={(e) =>
                    setResetOtp(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="123456"
                />
              </label>

              <label className="auth-field">
                <span>New password</span>
                <input
                  required
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="New password"
                />
              </label>

              <label className="auth-field">
                <span>Confirm password</span>
                <input
                  required
                  type="password"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  placeholder="Repeat new password"
                />
              </label>

              {errorMessage && <div className="auth-error">{errorMessage}</div>}

              <button
                className="primary-btn auth-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Updating..." : "Set New Password"}
              </button>
            </form>

            <button
              className="auth-forgot-link"
              onClick={() => {
                setView("forgot");
                setErrorMessage("");
              }}
            >
              ← Resend code
            </button>
          </>
        )}
      </section>
    </main>
  );
}

export default AuthGate;
