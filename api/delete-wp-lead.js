async function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = await parseBody(req);
  console.log("delete-wp-lead body:", JSON.stringify(body));
  const { email, wpLeadId } = body;

  if (!email && !wpLeadId) {
    return res.status(400).json({ error: "email or wpLeadId required" });
  }

  const wpUrl = process.env.WORDPRESS_SITE_URL;
  if (!wpUrl) return res.status(500).json({ error: "WORDPRESS_SITE_URL not configured" });

  const headers = {
    "Content-Type": "application/json",
    "x-webhook-secret": process.env.WEBHOOK_SECRET,
  };

  try {
    let resp;

    if (wpLeadId) {
      // Delete by WordPress post ID — most reliable, no body needed for DELETE
      resp = await fetch(`${wpUrl}/wp-json/ywe/v1/leads/${wpLeadId}`, {
        method: "DELETE",
        headers,
      });
    }

    // Fall back to email lookup (also pass email as query param since PHP may
    // not parse the request body on DELETE requests)
    if (!resp || !resp.ok) {
      if (!email) {
        const data = resp ? await resp.json().catch(() => ({})) : {};
        return res.status(resp?.status ?? 400).json(data);
      }
      resp = await fetch(
        `${wpUrl}/wp-json/ywe/v1/lead-by-email?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers,
          // also send in body for plugins that read it
          body: JSON.stringify({ email }),
        },
      );
    }

    const data = await resp.json().catch(() => ({}));
    return res.status(resp.ok ? 200 : resp.status).json(data);
  } catch (err) {
    console.error("delete-wp-lead error:", err);
    return res.status(500).json({ error: "Failed to delete from WordPress" });
  }
}
