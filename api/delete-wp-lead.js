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
  const { email, wpLeadId } = body;

  if (!email && !wpLeadId) {
    return res.status(400).json({ error: "email or wpLeadId required" });
  }

  const wpUrl = (process.env.WORDPRESS_SITE_URL || "").replace(/\/+$/, "");
  if (!wpUrl) return res.status(500).json({ error: "WORDPRESS_SITE_URL not configured" });

  const headers = {
    "Content-Type": "application/json",
    "x-webhook-secret": process.env.WEBHOOK_SECRET,
    // Some hosts/firewalls block the raw DELETE verb; WP core's REST API
    // natively honors this override header and routes it as DELETE.
    "X-HTTP-Method-Override": "DELETE",
  };

  try {
    let resp;

    // Preferred: delete by WordPress lead ID (exact row match in ywe_leads table)
    if (wpLeadId) {
      resp = await fetch(`${wpUrl}/wp-json/ywe/v1/lead/${wpLeadId}`, {
        method: "POST",
        headers,
      });
      console.log(`delete by id=${wpLeadId} status:`, resp.status);
    }

    // Fallback: delete by email
    if (!resp || !resp.ok) {
      if (!email) {
        const data = resp ? await resp.json().catch(() => ({})) : { error: "no email fallback" };
        return res.status(resp?.status ?? 400).json(data);
      }
      resp = await fetch(`${wpUrl}/wp-json/ywe/v1/lead-by-email`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email }),
      });
      console.log(`delete by email=${email} status:`, resp.status);
    }

    const data = await resp.json().catch(() => ({}));
    return res.status(resp.ok ? 200 : resp.status).json(data);
  } catch (err) {
    console.error("delete-wp-lead error:", err);
    return res.status(500).json({ error: "Failed to delete from WordPress" });
  }
}
