export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { wpLeadId } = req.body || {};
  if (!wpLeadId) return res.status(400).json({ error: "wpLeadId required" });

  const wpUrl = process.env.WORDPRESS_SITE_URL;
  if (!wpUrl) return res.status(500).json({ error: "WORDPRESS_SITE_URL not configured" });

  try {
    const resp = await fetch(`${wpUrl}/wp-json/ywe/v1/lead/${wpLeadId}`, {
      method: "DELETE",
      headers: { "x-webhook-secret": process.env.WEBHOOK_SECRET },
    });
    const data = await resp.json().catch(() => ({}));
    return res.status(resp.ok ? 200 : resp.status).json(data);
  } catch (err) {
    console.error("delete-wp-lead error:", err);
    return res.status(500).json({ error: "Failed to delete from WordPress" });
  }
}
