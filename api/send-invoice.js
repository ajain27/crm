export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Resend API key not configured." });
  }

  const { toEmail, subject, htmlContent, pdfBase64, invoiceNum } = req.body;

  if (!toEmail || !subject || !htmlContent) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const body = {
    from: "You Win Concepts <info@youwinconcepts.com>",
    to: [toEmail],
    subject,
    html: htmlContent,
  };

  if (pdfBase64 && invoiceNum) {
    body.attachments = [{ filename: `${invoiceNum}.pdf`, content: pdfBase64 }];
  }

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await resendRes.json();

  if (!resendRes.ok) {
    return res.status(resendRes.status).json({ error: data.message || "Send failed." });
  }

  return res.status(200).json({ id: data.id });
}
