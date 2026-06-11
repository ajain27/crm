import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = ["http://localhost:5173", "https://ajain27.github.io"];

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }

  res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error("ERROR: Google credentials not configured");
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env");
  process.exit(1);
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Exchange authorization code for access token
app.post("/api/google/exchange-code", async (req, res) => {
  try {
    const { code, redirectUri } = req.body;

    if (!code || !redirectUri) {
      return res.status(400).json({ error: "Missing code or redirectUri" });
    }

    const response = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    const { access_token, refresh_token, id_token, expires_in } = response.data;

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

// Fetch Google Calendar events
app.post("/api/google/fetch-events", async (req, res) => {
  try {
    const { accessToken, timeMin, timeMax } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: "Missing access token" });
    }

    const response = await axios.get(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          timeMin: timeMin || new Date().toISOString(),
          timeMax:
            timeMax ||
            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 250,
        },
      }
    );

    return res.status(200).json({
      success: true,
      events: response.data.items || [],
    });
  } catch (error) {
    console.error(
      "Calendar fetch error:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      error: "Failed to fetch calendar events",
      details: error.response?.data?.error?.message || error.message,
    });
  }
});

// Refresh access token
app.post("/api/google/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Missing refresh token" });
    }

    const response = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
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

app.listen(PORT, () => {
  console.log(`Google Calendar server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
