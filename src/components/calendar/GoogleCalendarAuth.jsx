import { useState, useEffect } from "react";
import { LogOut, Calendar } from "lucide-react";
import "./GoogleCalendarAuth.css";

function GoogleCalendarAuth({
  onAccountAdded,
  connectedAccounts,
  onRemoveAccount,
}) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if we just returned from Google OAuth
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      exchangeCodeForToken(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const exchangeCodeForToken = async (code) => {
    setError("");
    try {
      // Use server URL (localhost in dev, Railway URL in prod)
      const serverUrl =
        import.meta.env.VITE_CALENDAR_SERVER_URL || "http://localhost:5000";
      const apiUrl = `${serverUrl}/api/google/exchange-code`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code,
          redirectUri: `${window.location.origin}/callback.html`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Decode ID token to get user info
        const idToken = data.idToken;
        const base64Url = idToken.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const decoded = JSON.parse(atob(base64));

        onAccountAdded({
          email: decoded.email,
          name: decoded.name,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresIn: data.expiresIn,
        });
      } else {
        setError(data.details || "Failed to authorize with Google Calendar");
      }
    } catch (err) {
      console.error("Token exchange error:", err);
      setError("Failed to connect to Google Calendar. Try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setError("");

    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = `${window.location.origin}/callback.html`;
      const scope = encodeURIComponent(
        "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
      );
      const state = Math.random().toString(36).substring(7);

      // Store state for CSRF protection
      sessionStorage.setItem("google_oauth_state", state);

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;

      window.location.href = authUrl;
    } catch (err) {
      console.error("Sign-in error:", err);
      setError("Failed to initiate sign-in. Check your configuration.");
      setIsSigningIn(false);
    }
  };

  return (
    <div className="google-calendar-auth">
      <div className="auth-section">
        <h4>Connect Google Calendar</h4>
        <p className="auth-description">
          Sign in with your Google account to sync calendar events
        </p>

        {error && <div className="auth-error">{error}</div>}

        <button
          className="google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
        >
          <Calendar size={16} />
          {isSigningIn ? "Signing in..." : "Connect Google Calendar"}
        </button>
      </div>

      {connectedAccounts && connectedAccounts.length > 0 && (
        <div className="connected-accounts">
          <h5>Connected Accounts</h5>
          {connectedAccounts.map((account) => (
            <div key={account.email} className="connected-account-item">
              <div className="account-info">
                <span className="account-email">{account.email}</span>
                <span className="account-name">{account.name}</span>
              </div>
              <button
                className="remove-account-btn"
                onClick={() => onRemoveAccount(account.email)}
                title="Disconnect"
              >
                <LogOut size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="setup-guide">
        <h5>Setup Instructions</h5>
        <ol>
          <li>
            Go to{" "}
            <a
              href="https://console.cloud.google.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Cloud Console
            </a>
          </li>
          <li>Create a new project</li>
          <li>Enable the Google Calendar API</li>
          <li>Create OAuth 2.0 credentials (Web application)</li>
          <li>
            Add this URL to authorized redirect URIs:
            <code>{window.location.origin}/callback</code>
          </li>
          <li>
            Copy your Client ID and add it to <code>.env.local</code>:
            <code>VITE_GOOGLE_CLIENT_ID=your-client-id</code>
          </li>
          <li>Restart the dev server</li>
          <li>Click "Connect Google Calendar" button</li>
        </ol>
      </div>
    </div>
  );
}

export default GoogleCalendarAuth;
