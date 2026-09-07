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

// Leadzolo's exact payload shape isn't documented publicly — this pulls
// from every plausible field-name variant (snake_case, camelCase, and a
// nested `lead`/`contact` object, which many lead-gen platforms use) so
// the mapping has the best chance of working on the first real delivery.
// `raw` always keeps the untouched body too, so nothing is lost even if
// none of these guesses match — check it in Firestore and tell me the
// actual key names if fields come through empty, and this gets adjusted.
function mapToLead(body, userId) {
  const lead = body?.lead || body?.contact || body;

  const get = (...keys) => {
    for (const k of keys) {
      const v = lead?.[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
    return "";
  };

  const firstName = get("first_name", "firstName", "given_name");
  const lastName = get("last_name", "lastName", "family_name", "surname");
  const fullName =
    get("name", "full_name", "fullName", "seller_name", "sellerName") ||
    [firstName, lastName].filter(Boolean).join(" ");

  const source = get("source", "campaign", "campaign_name") || "Leadzolo";

  return {
    id: randomUUID(),
    userId,
    leadType: "residential",
    dateAdded: todayStr(),
    dateAddedAt: new Date().toISOString(),
    source,
    pplSource: true,
    dealType: "Wholesale",
    address: get(
      "address",
      "property_address",
      "propertyAddress",
      "street_address",
      "full_address",
    ),
    sellerName: fullName,
    email: get("email", "email_address"),
    phone: get("phone", "phone_number", "phoneNumber", "mobile"),
    notes: get("notes", "message", "comments", "description"),
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
