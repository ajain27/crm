// Google Calendar API Service
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

// Initialize Google API
export function initializeGoogleAPI() {
  if (!GOOGLE_CLIENT_ID) {
    console.error("Google Client ID not configured");
    return false;
  }

  return gapi.load("client", async () => {
    try {
      await gapi.client.init({
        clientId: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPES.join(" "),
      });
    } catch (error) {
      console.error("Failed to initialize Google API:", error);
    }
  });
}

// Sign in with Google
export async function signInWithGoogle() {
  try {
    const auth2 = gapi.auth2.getAuthInstance();
    if (!auth2.isSignedIn.get()) {
      const user = await auth2.signIn();
      return {
        success: true,
        user: {
          email: user.getBasicProfile().getEmail(),
          name: user.getBasicProfile().getName(),
          token: user.getAuthResponse().id_token,
        },
      };
    }
    return { success: true, user: auth2.currentUser.get().getBasicProfile() };
  } catch (error) {
    console.error("Google sign-in failed:", error);
    return { success: false, error };
  }
}

// Fetch calendar events
export async function fetchCalendarEvents(timeMin, timeMax) {
  try {
    const response = await gapi.client.calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    return response.result.items || [];
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
    return [];
  }
}

// Get list of calendars
export async function getCalendarList() {
  try {
    const response = await gapi.client.calendar.calendarList.list();
    return response.result.items || [];
  } catch (error) {
    console.error("Failed to fetch calendar list:", error);
    return [];
  }
}

// Sign out
export async function signOutGoogle() {
  try {
    const auth2 = gapi.auth2.getAuthInstance();
    await auth2.signOut();
    return true;
  } catch (error) {
    console.error("Google sign-out failed:", error);
    return false;
  }
}
