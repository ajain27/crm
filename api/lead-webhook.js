import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { randomUUID } from "crypto";

function initAdmin() {
  if (getApps().length) return;
  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    console.log("init: using base64 service account");
    const json = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.replace(/\s/g, ""), "base64").toString("utf8")
    );
    console.log("init: project_id =", json.project_id);
    credential = cert(json);
  } else {
    console.log("init: using individual env vars, project =", process.env.FIREBASE_PROJECT_ID);
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

  return {
    id: randomUUID(),
    userId,
    leadType: "residential",
    dateAdded: todayStr(),
    source: get("source") || "Website",
    dealType: get("deal_type", "dealType") || "Wholesale",
    address: get("address", "property_address", "propertyAddress"),
    sellerName: get("seller-name", "seller_name", "sellerName", "full_name", "fullName", "your-name", "name"),
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
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-webhook-secret");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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
    initAdmin();
    const db = getFirestore();
    const lead = mapToLead(req.body, userId);

    if (!lead.address && !lead.sellerName && !lead.email && !lead.phone) {
      return res.status(400).json({ error: "Lead must have at least an address, name, email, or phone" });
    }

    await db.collection("leads").doc(lead.id).set(lead);
    return res.status(200).json({ success: true, id: lead.id });
  } catch (err) {
    console.error("lead-webhook error:", err);
    return res.status(500).json({ error: "Failed to save lead" });
  }
}
