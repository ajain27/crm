import { useState } from "react";
import { signInUser } from "../../firebase/firestoreService";

function AuthGate({ onAuthenticated }) {
  const [form, setForm] = useState({ email: "", password: "" });
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

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-copy">
          <h1>Sign in to your CRM</h1>
          <p>Access your deals, buyers, and notes.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
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
            {isSubmitting ? "Please wait..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default AuthGate;
