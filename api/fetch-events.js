import axios from "axios";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
}
