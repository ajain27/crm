import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";
import {
  EMAIL_SEQUENCE,
  addDays,
  renderEmailTemplate,
  BUSINESS_PHONE,
  AUTOMATION_SENDER_EMAIL,
} from "../src/constants/emailSequence.js";

// Local-testing-only override: when set (e.g. LOCAL_TEST_INTERVAL_SECONDS=15
// in .env.local), each step fires N seconds after the previous one instead
// of on its real dayOffset, so the whole sequence can be watched end-to-end
// in a couple of minutes. Never set in production.
function computeNextSendAt(startedAt, nextStepIndex) {
  const testIntervalSeconds = Number(process.env.LOCAL_TEST_INTERVAL_SECONDS);
  if (testIntervalSeconds > 0) {
    return new Date(
      new Date(startedAt).getTime() + nextStepIndex * testIntervalSeconds * 1000,
    ).toISOString();
  }
  return addDays(startedAt, EMAIL_SEQUENCE[nextStepIndex].dayOffset);
}

// Same flexible service-account resolution as api/lead-webhook.js, so this
// works whichever way Firebase Admin credentials are set in Vercel.
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
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  } else {
    credential = cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    });
  }
  initializeApp({ credential });
}

function getTransport() {
  const user = process.env.GMAIL_USER || AUTOMATION_SENDER_EMAIL;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

function firstNameOf(sellerName) {
  return (sellerName || "").trim().split(/\s+/)[0] || "";
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

  const transport = getTransport();
  if (!transport) {
    return res.status(500).json({
      error: "Email is not configured. Missing GMAIL_APP_PASSWORD.",
    });
  }

  try {
    initAdmin();
  } catch {
    return res.status(500).json({
      error:
        "Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT (or the individual FIREBASE_* vars).",
    });
  }

  const db = getFirestore();
  const now = new Date().toISOString();

  const snapshot = await db
    .collection("leads")
    .where("emailSequence.status", "==", "running")
    .where("emailSequence.nextSendAt", "<=", now)
    .get();

  if (snapshot.empty) {
    return res.status(200).json({ sent: 0, message: "No automation emails due" });
  }

  let sentCount = 0;
  const errors = [];

  for (const docSnap of snapshot.docs) {
    const lead = docSnap.data();
    const seq = lead.emailSequence;
    const step = EMAIL_SEQUENCE[seq.currentStep];

    if (!lead.email || !step) {
      errors.push({ id: docSnap.id, error: "Missing email or invalid step" });
      continue;
    }

    const { subject, body } = renderEmailTemplate(step, {
      firstName: firstNameOf(lead.sellerName),
      senderName: seq.senderName,
      phone: BUSINESS_PHONE,
    });

    try {
      await transport.sendMail({
        from: `"${seq.senderName || "You Win Estates"}" <${process.env.GMAIL_USER || AUTOMATION_SENDER_EMAIL}>`,
        to: lead.email,
        subject,
        text: body,
      });

      const nextStep = seq.currentStep + 1;
      const isLastStep = nextStep >= EMAIL_SEQUENCE.length;

      await docSnap.ref.update({
        emailSequence: {
          ...seq,
          currentStep: nextStep,
          status: isLastStep ? "completed" : "running",
          nextSendAt: isLastStep
            ? seq.nextSendAt
            : computeNextSendAt(seq.startedAt, nextStep),
        },
        // No response after the full sequence — flag it bad and lock it
        // down (matches the existing PPC thumbs-down behavior) until the
        // user marks it "good" themselves.
        ...(isLastStep && {
          ppcQuality: "bad",
          ppcBadReason: "No response after the full email follow-up sequence.",
        }),
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
