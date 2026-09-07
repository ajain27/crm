import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

function initAdmin() {
  if (getApps().length) return;
  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = JSON.parse(
      Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.replace(/\s/g, ""),
        "base64",
      ).toString("utf8"),
    );
    credential = cert(json);
  } else {
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

// Confirmed against Leadzolo's actual payload template (seen in their
// webhook "Payload" preview):
// {
//   "public_id": "...", "name": "<tenant/account name — NOT the lead>",
//   "event": "Test" | ..., "lead_type": "...", "scope": "...",
//   "received_on": "...", "charged_amount": "$80.00",
//   "deliverable_fields": "...",
//   "lead": {
//     "first_name", "last_name", "email", "phone",
//     "address_1", "address_2", "city", "state", "zip", "county", "country"
//   }
// }
// The top-level `name` is Leadzolo's account/tenant name, not the lead's —
// only `body.lead.*` holds the actual lead data.
function mapToLead(body, userId) {
  const lead = body?.lead || {};

  const get = (...keys) => {
    for (const k of keys) {
      const v = lead?.[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
    return "";
  };

  const firstName = get("first_name", "firstName");
  const lastName = get("last_name", "lastName");
  const fullName =
    get("full_name", "name") || [firstName, lastName].filter(Boolean).join(" ");

  // Built to match the "street[, city, STATE ZIP]" shape parseAddress() in
  // PotentialLeads.jsx expects — unit goes on the street line (space, not
  // comma) so it doesn't shift city/state/zip into the wrong segment.
  const street = [get("address_1", "address"), get("address_2")]
    .filter(Boolean)
    .join(" ");
  const city = get("city");
  const stateZip = [get("state"), get("zip", "zip_code", "postal_code")]
    .filter(Boolean)
    .join(" ");
  const address = [street, city, stateZip].filter(Boolean).join(", ");

  const isTest = String(body?.event || "").toLowerCase() === "test";
  const chargedAmount = String(body?.charged_amount || "").trim();
  const leadTypeLabel = String(body?.lead_type || "").trim();
  const notes = [
    isTest ? "[Test delivery from Leadzolo]" : "",
    get("notes", "message", "comments"),
    leadTypeLabel ? `Lead Type: ${leadTypeLabel}` : "",
    chargedAmount ? `Charged: ${chargedAmount}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    id: randomUUID(),
    userId,
    leadType: "residential",
    dateAdded: todayStr(),
    dateAddedAt: new Date().toISOString(),
    source: "Leadzolo",
    pplSource: true,
    dealType: "Wholesale",
    address,
    sellerName: fullName,
    email: get("email", "email_address"),
    phone: get("phone", "phone_number", "phoneNumber"),
    notes,
    followUpDate: "",
    onMarket: "No",
    listedPrice: "",
    rent: "",
    occupied: "No",
    offerStatus: "Not Sent",
    sellerAccepted: "No",
    offerPrice: "",
    leadzoloRaw: JSON.stringify(body).slice(0, 5000),
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

  const secret = req.headers["x-webhook-secret"] || req.query.secret;
  if (
    !process.env.LEADZOLO_WEBHOOK_SECRET ||
    secret !== process.env.LEADZOLO_WEBHOOK_SECRET
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = process.env.WEBHOOK_USER_ID;
  if (!userId) {
    return res.status(500).json({ error: "WEBHOOK_USER_ID not configured" });
  }

  try {
    console.log("leadzolo-webhook body:", JSON.stringify(req.body));
    initAdmin();
    const db = getFirestore();
    const lead = mapToLead(req.body, userId);

    if (!lead.address && !lead.sellerName && !lead.email && !lead.phone) {
      return res.status(400).json({
        error: "Lead must have at least an address, name, email, or phone",
      });
    }

    await db.collection("leads").doc(lead.id).set(lead);
    return res.status(200).json({ success: true, id: lead.id });
  } catch (err) {
    console.error("leadzolo-webhook error:", err);
    return res.status(500).json({ error: "Failed to save lead" });
  }
}
