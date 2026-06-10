const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// Exchange authorization code for access token
exports.exchangeGoogleAuthCode = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { code, redirectUri } = req.body;

      if (!code || !redirectUri) {
        return res.status(400).json({ error: "Missing code or redirectUri" });
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.error("Google credentials not configured");
        return res.status(500).json({ error: "Google credentials not configured" });
      }

      // Exchange code for tokens
      const response = await axios.post("https://oauth2.googleapis.com/token", {
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      });

      const { access_token, refresh_token, id_token, expires_in } = response.data;

      // Return tokens to frontend
      return res.status(200).json({
        success: true,
        accessToken: access_token,
        refreshToken: refresh_token,
        idToken: id_token,
        expiresIn: expires_in,
      });
    } catch (error) {
      console.error("Token exchange error:", error.response?.data || error.message);
      return res.status(500).json({
        error: "Failed to exchange code for token",
        details: error.response?.data?.error_description || error.message,
      });
    }
  });
});

// Fetch Google Calendar events
exports.fetchGoogleCalendarEvents = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { accessToken, timeMin, timeMax } = req.body;

      if (!accessToken) {
        return res.status(400).json({ error: "Missing access token" });
      }

      const response = await axios.get("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          timeMin: timeMin || new Date().toISOString(),
          timeMax: timeMax || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 250,
        },
      });

      return res.status(200).json({
        success: true,
        events: response.data.items || [],
      });
    } catch (error) {
      console.error("Calendar fetch error:", error.response?.data || error.message);
      return res.status(500).json({
        error: "Failed to fetch calendar events",
        details: error.response?.data?.error?.message || error.message,
      });
    }
  });
});

// Refresh access token
exports.refreshGoogleToken = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: "Missing refresh token" });
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      const response = await axios.post("https://oauth2.googleapis.com/token", {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      });

      return res.status(200).json({
        success: true,
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
      });
    } catch (error) {
      console.error("Token refresh error:", error.response?.data || error.message);
      return res.status(500).json({
        error: "Failed to refresh token",
        details: error.response?.data?.error_description || error.message,
      });
    }
  });
});
