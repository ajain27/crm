import { useState } from "react";
import { createUserAccount, signInUser } from "../../firebase/firestoreService";

const emptyForm = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  password: "",
};

function AuthGate({ onAuthenticated }) {
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState(emptyForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const user =
        mode === "signin"
          ? await signInUser({
              email: form.email,
              password: form.password,
            })
          : await createUserAccount({
              firstName: form.firstName,
              lastName: form.lastName,
              username: form.username,
              email: form.email,
              password: form.password,
            });

      setForm(emptyForm);
      onAuthenticated(user);
    } catch (error) {
      setErrorMessage(error.message || "Unable to continue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-copy">
          <h1>Sign in to your CRM</h1>
          <p>
            Access only your own deals, buyers, and notes. Create an account if
            this is your first time here.
          </p>
        </div>

        <div className="auth-toggle" role="tablist" aria-label="Auth mode">
          <button
            type="button"
            className={mode === "signin" ? "active" : ""}
            onClick={() => {
              setMode("signin");
              setErrorMessage("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={mode === "signup" ? "active" : ""}
            onClick={() => {
              setMode("signup");
              setErrorMessage("");
            }}
          >
            Create Account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <>
              <label className="auth-field">
                <span>First Name</span>
                <input
                  required
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                />
              </label>

              <label className="auth-field">
                <span>Last Name</span>
                <input
                  required
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                />
              </label>

              <label className="auth-field">
                <span>Username</span>
                <input
                  required
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Username"
                />
              </label>
            </>
          )}

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

          <button className="primary-btn auth-submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Please wait..."
              : mode === "signin"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default AuthGate;
