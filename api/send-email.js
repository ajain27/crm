export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.BREVO_API_KEY || process.env.VITE_BREVO_API_KEY;
  const resendApiKey =
    process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  if (!apiKey && !resendApiKey) {
    return res.status(500).json({
      error:
        "Email is not configured. Missing BREVO_API_KEY or RESEND_API_KEY.",
    });
  }

  const { toEmail, subject, textContent, htmlContent } = req.body || {};
  if (!toEmail || !subject || !textContent) {
    return res.status(400).json({
      error: "toEmail, subject, and textContent are required.",
    });
  }

  const senderEmail =
    process.env.BREVO_SENDER_EMAIL ||
    process.env.VITE_BREVO_SENDER_EMAIL ||
    "ankit4pace@gmail.com";

  if (resendApiKey) {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          process.env.RESEND_FROM_EMAIL ||
          "You Win Estates CRM <info@youwinconcepts.com>",
        to: [toEmail],
        subject,
        text: textContent,
        ...(htmlContent ? { html: htmlContent } : {}),
      }),
    });

    const resendData = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      return res.status(resendResponse.status).json({
        error:
          resendData.message ||
          `Resend failed with HTTP ${resendResponse.status}`,
        details: resendData,
      });
    }

    return res
      .status(200)
      .json({ ok: true, provider: "resend", data: resendData });
  }

  const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "You Win Estates CRM", email: senderEmail },
      to: [{ email: toEmail }],
      subject,
      textContent,
      ...(htmlContent ? { htmlContent } : {}),
    }),
  });

  const data = await brevoResponse.json().catch(() => ({}));
  if (!brevoResponse.ok) {
    return res.status(brevoResponse.status).json({
      error: data.message || `Brevo failed with HTTP ${brevoResponse.status}`,
      details: data,
    });
  }

  return res.status(200).json({ ok: true, provider: "brevo", data });
}
