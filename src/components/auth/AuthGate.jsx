import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  activateUserAccount,
  createUserAccount,
  signInUser,
  sendPasswordResetOtp,
  confirmPasswordReset,
} from "../../firebase/firestoreService";

function AuthGate({ onAuthenticated }) {
  const [view, setView] = useState("login"); // "login" | "signup" | "forgot" | "reset"
  const [form, setForm] = useState({ username: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({
    login: false,
    signup: false,
    signupConfirm: false,
    reset: false,
    resetConfirm: false,
  });

  function togglePasswordVisibility(field) {
    setVisiblePasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSignupChange(event) {
    const { name, value } = event.target;
    setSignupForm((prev) => ({ ...prev, [name]: value }));
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("activate");
    if (!token) return;

    setIsSubmitting(true);
    activateUserAccount(token)
      .then(() => {
        window.history.replaceState({}, "", window.location.pathname);
        setView("login");
        setSuccessMessage("Account activated. You can now sign in.");
      })
      .catch((error) => {
        setErrorMessage(error.message || "Could not activate account.");
      })
      .finally(() => setIsSubmitting(false));
  }, []);

  function goToLogin() {
    setView("login");
    setErrorMessage("");
    setSuccessMessage("");
    setResetOtp("");
    setResetPassword("");
    setResetConfirm("");
  }

  async function handleSignup(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (signupForm.password !== signupForm.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (signupForm.password.length < 4) {
      setErrorMessage("Password must be at least 4 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createUserAccount(signupForm);
      const submittedEmail = signupForm.email;
      setSignupForm({
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setView("login");
      setSuccessMessage(
        result.emailFailed
          ? `Account created, but we couldn't send the activation email to ${submittedEmail}. Sign up again with the same email to resend it.`
          : `Activation email sent to ${submittedEmail}. Activate your account before signing in.`,
      );
    } catch (error) {
      setErrorMessage(error.message || "Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignIn(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const user = await signInUser({
        username: form.username,
        password: form.password,
      });
      setForm({ username: "", password: "" });
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
                <span>Username</span>
                <input
                  required
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Username"
                  autoComplete="username"
                />
              </label>

              <label className="auth-field">
                <span>Password</span>
                <div className="auth-password-wrap">
                  <input
                    required
                    type={visiblePasswords.login ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => togglePasswordVisibility("login")}
                    aria-label={
                      visiblePasswords.login ? "Hide password" : "Show password"
                    }
                  >
                    {visiblePasswords.login ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </label>

              {errorMessage && <div className="auth-error">{errorMessage}</div>}

              <button
                className="primary-btn auth-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Please wait..." : "Sign In"}
              </button>
            </form>

            <div className="auth-login-actions">
              <button
                className="auth-forgot-link"
                onClick={() => {
                  setErrorMessage("");
                  setSuccessMessage("");
                  setView("signup");
                }}
              >
                Create account
              </button>

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
            </div>
          </>
        )}

        {view === "signup" && (
          <>
            <div className="auth-copy">
              <h1>Create your PPC access</h1>
              <p>Activate by email, then sign in to view PPC leads.</p>
            </div>

            <form className="auth-form" onSubmit={handleSignup}>
              <label className="auth-field">
                <span>First Name</span>
                <input
                  required
                  type="text"
                  name="firstName"
                  value={signupForm.firstName}
                  onChange={handleSignupChange}
                  placeholder="First name"
                  autoComplete="off"
                />
              </label>

              <label className="auth-field">
                <span>Last Name</span>
                <input
                  required
                  type="text"
                  name="lastName"
                  value={signupForm.lastName}
                  onChange={handleSignupChange}
                  placeholder="Last name"
                  autoComplete="off"
                />
              </label>

              <label className="auth-field">
                <span>Username</span>
                <input
                  required
                  type="text"
                  name="username"
                  value={signupForm.username}
                  onChange={handleSignupChange}
                  placeholder="Username"
                  autoComplete="username"
                />
              </label>

              <label className="auth-field">
                <span>Email</span>
                <input
                  required
                  type="email"
                  name="email"
                  value={signupForm.email}
                  onChange={handleSignupChange}
                  placeholder="you@example.com"
                />
              </label>

              <label className="auth-field">
                <span>Password</span>
                <div className="auth-password-wrap">
                  <input
                    required
                    type={visiblePasswords.signup ? "text" : "password"}
                    name="password"
                    value={signupForm.password}
                    onChange={handleSignupChange}
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => togglePasswordVisibility("signup")}
                    aria-label={
                      visiblePasswords.signup
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {visiblePasswords.signup ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </label>

              <label className="auth-field">
                <span>Confirm Password</span>
                <div className="auth-password-wrap">
                  <input
                    required
                    type={visiblePasswords.signupConfirm ? "text" : "password"}
                    name="confirmPassword"
                    value={signupForm.confirmPassword}
                    onChange={handleSignupChange}
                    placeholder="Repeat password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => togglePasswordVisibility("signupConfirm")}
                    aria-label={
                      visiblePasswords.signupConfirm
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {visiblePasswords.signupConfirm ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </label>

              {errorMessage && <div className="auth-error">{errorMessage}</div>}

              <button
                className="primary-btn auth-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Account"}
              </button>
            </form>

            <button className="auth-forgot-link" onClick={goToLogin}>
              ← Back to sign in
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
                <div className="auth-password-wrap">
                  <input
                    required
                    type={visiblePasswords.reset ? "text" : "password"}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="New password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => togglePasswordVisibility("reset")}
                    aria-label={
                      visiblePasswords.reset ? "Hide password" : "Show password"
                    }
                  >
                    {visiblePasswords.reset ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </label>

              <label className="auth-field">
                <span>Confirm password</span>
                <div className="auth-password-wrap">
                  <input
                    required
                    type={visiblePasswords.resetConfirm ? "text" : "password"}
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    placeholder="Repeat new password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => togglePasswordVisibility("resetConfirm")}
                    aria-label={
                      visiblePasswords.resetConfirm
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {visiblePasswords.resetConfirm ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
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
