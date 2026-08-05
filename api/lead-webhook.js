import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

function initAdmin() {
  if (getApps().length) return;
  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    console.log("init: using base64 service account");
    const json = JSON.parse(
      Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.replace(/\s/g, ""),
        "base64",
      ).toString("utf8"),
    );
    console.log("init: project_id =", json.project_id);
    credential = cert(json);
  } else {
    console.log(
      "init: using individual env vars, project =",
      process.env.FIREBASE_PROJECT_ID,
    );
    credential = cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    });
  }
  initializeApp({ credential });
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isPpcSource(source) {
  const normalized = String(source || "").toLowerCase();
  return [
    "website",
    "ppc",
    "google ad",
    "google ads",
    "adwords",
    "paid search",
    "facebook ad",
    "facebook ads",
    "meta ad",
    "meta ads",
  ].some((term) => normalized.includes(term));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function notificationEmailsFromEnv() {
  return [
    process.env.LEAD_NOTIFICATION_EMAILS,
    process.env.LEAD_NOTIFICATION_EMAIL,
    process.env.WEBHOOK_NOTIFICATION_EMAILS,
    process.env.WEBHOOK_NOTIFICATION_EMAIL,
  ]
    .filter(Boolean)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

async function getNotificationEmails(db, userId) {
  const envEmails = notificationEmailsFromEnv();
  if (envEmails.length) return envEmails;

  const userSnap = await db.collection("users").doc(userId).get();
  const userEmail = userSnap.exists ? userSnap.data()?.email : "";
  return userEmail ? [userEmail] : [];
}

function leadNotificationHtml(lead) {
  const rows = [
    ["Name", lead.sellerName],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Address", lead.address],
    ["Source", lead.source],
    ["Deal Type", lead.dealType],
    ["Agent", lead.agentName],
    ["Agent Phone", lead.agentPhone],
    ["Listing URL", lead.url],
    ["Notes", lead.notes],
  ]
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#64748b;">${escapeHtml(label)}</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.45;color:#0f172a;">
      <h2 style="margin:0 0 12px;">New PPC lead submitted</h2>
      <table style="border-collapse:collapse;">${rows}</table>
    </div>
  `;
}

async function sendLeadNotification(db, userId, lead) {
  const apiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "lead-webhook notification skipped: Resend API key not configured",
    );
    return { skipped: true, reason: "missing_api_key" };
  }

  const to = await getNotificationEmails(db, userId);
  if (!to.length) {
    console.warn("lead-webhook notification skipped: no recipient configured");
    return { skipped: true, reason: "missing_recipient" };
  }

  const from =
    process.env.LEAD_NOTIFICATION_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    "You Win Concepts <info@youwinconcepts.com>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `New PPC lead${lead.sellerName ? `: ${lead.sellerName}` : ""}`,
      html: leadNotificationHtml(lead),
      text: [
        "New PPC lead submitted",
        `Name: ${lead.sellerName || ""}`,
        `Email: ${lead.email || ""}`,
        `Phone: ${lead.phone || ""}`,
        `Address: ${lead.address || ""}`,
        `Source: ${lead.source || ""}`,
        `Deal Type: ${lead.dealType || ""}`,
        `Listing URL: ${lead.url || ""}`,
        `Notes: ${lead.notes || ""}`,
      ].join("\n"),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data.message || `Resend failed with HTTP ${response.status}`,
    );
  }

  return { skipped: false, id: data.id };
}

// Maps flexible WordPress / Zapier field names → lead shape
function mapToLead(body, userId) {
  const get = (...keys) => {
    for (const k of keys) {
      const v = body[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
    return "";
  };

  const source =
    get("source", "utm_source", "lead_source", "campaign_source") || "Website";

  return {
    id: randomUUID(),
    userId,
    leadType: "residential",
    dateAdded: todayStr(),
    dateAddedAt: new Date().toISOString(),
    source,
    ppcSource: isPpcSource(source),
    dealType: get("deal_type", "dealType") || "Wholesale",
    address: get("address", "property_address", "propertyAddress"),
    sellerName: get(
      "seller-name",
      "seller_name",
      "sellerName",
      "full_name",
      "fullName",
      "your-name",
      "name",
    ),
    email: get("email", "seller_email", "sellerEmail"),
    phone: get("phone", "seller_phone", "sellerPhone"),
    agentName: get("agent_name", "agentName"),
    agentPhone: get("agent_phone", "agentPhone"),
    url: get("url", "listing_url", "listingUrl", "mls_url"),
    followUpDate: get("follow_up_date", "followUpDate"),
    notes: get("notes", "message", "comments"),
    onMarket: get("on_market", "onMarket") || "No",
    listedPrice: get("listed_price", "listedPrice", "asking_price"),
    rent: get("rent", "monthly_rent"),
    occupied: get("occupied") || "No",
    offerStatus: "Not Sent",
    sellerAccepted: "No",
    offerPrice: "",
    wpLeadId: body.wp_lead_id ? Number(body.wp_lead_id) : null,
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-webhook-secret",
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  // Validate secret — sent as header or query param
  const secret = req.headers["x-webhook-secret"] || req.query.secret;
  if (!process.env.WEBHOOK_SECRET || secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = process.env.WEBHOOK_USER_ID;
  if (!userId) {
    return res.status(500).json({ error: "WEBHOOK_USER_ID not configured" });
  }

  try {
    console.log("lead-webhook body wp_lead_id:", req.body?.wp_lead_id);
    initAdmin();
    const db = getFirestore();
    const lead = mapToLead(req.body, userId);

    if (!lead.address && !lead.sellerName && !lead.email && !lead.phone) {
      return res.status(400).json({
        error: "Lead must have at least an address, name, email, or phone",
      });
    }

    await db.collection("leads").doc(lead.id).set(lead);
    let notification = { skipped: true };
    try {
      notification = await sendLeadNotification(db, userId, lead);
    } catch (notificationErr) {
      console.error("lead-webhook notification error:", notificationErr);
      notification = { skipped: false, error: notificationErr.message };
    }

    return res.status(200).json({ success: true, id: lead.id, notification });
  } catch (err) {
    console.error("lead-webhook error:", err);
    return res.status(500).json({ error: "Failed to save lead" });
  }
}
