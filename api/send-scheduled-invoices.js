import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Lazy-initialize Firebase Admin so cold starts don't fail if env var is missing
let db;
function getDb() {
  if (!db) {
    if (!getApps().length) {
      // Set FIREBASE_SERVICE_ACCOUNT in Vercel env vars:
      // Firebase console → Project settings → Service accounts → Generate new private key
      const serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT || "{}",
      );
      initializeApp({ credential: cert(serviceAccount) });
    }
    db = getFirestore();
  }
  return db;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Vercel automatically sends Authorization: Bearer <CRON_SECRET> for cron invocations.
  // For local dev we skip this check.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  let firestore;
  try {
    firestore = getDb();
  } catch {
    return res
      .status(500)
      .json({ error: "Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT." });
  }

  const today = new Date().toISOString().slice(0, 10);
  const apiKey =
    process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;

  const snapshot = await firestore
    .collection("scheduledPayments")
    .where("status", "==", "pending")
    .where("dueDate", "<=", today)
    .get();

  if (snapshot.empty) {
    return res.status(200).json({ sent: 0, message: "No payments due today" });
  }

  let sentCount = 0;
  const errors = [];

  for (const docSnap of snapshot.docs) {
    const p = docSnap.data();
    try {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "You Win Concepts <info@youwinconcepts.com>",
          to: [p.toEmail],
          subject: `Payment ${p.paymentNum} of ${p.totalPayments} — ${p.invoiceNum} from You Win Concepts`,
          html: p.htmlContent,
        }),
      });

      if (!resendRes.ok) {
        const err = await resendRes.json().catch(() => ({}));
        errors.push({
          id: docSnap.id,
          error: err.message || `HTTP ${resendRes.status}`,
        });
        continue;
      }

      await docSnap.ref.update({
        status: "sent",
        sentAt: new Date().toISOString(),
      });
      sentCount++;
    } catch (err) {
      errors.push({ id: docSnap.id, error: err.message });
    }
  }

  return res.status(200).json({
    sent: sentCount,
    errors: errors.length,
    ...(errors.length > 0 && { details: errors }),
  });
}
