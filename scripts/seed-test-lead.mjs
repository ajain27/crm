// One-off local dev helper: seeds a dummy lead so the "Run Automation" /
// email-drip flow can be tested end-to-end without waiting on real leads.
// Uses the same client Firebase config the app itself uses (VITE_FIREBASE_*
// in .env.local) — no admin credentials needed for this part.
//
// Usage: node scripts/seed-test-lead.mjs
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  query,
  limit,
} from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const usersSnap = await getDocs(query(collection(db, "users"), limit(1)));
if (usersSnap.empty) {
  console.error(
    "No users found in Firestore — log into the CRM once first so a user doc exists, then re-run this.",
  );
  process.exit(1);
}
const userId = usersSnap.docs[0].id;

const leadId = "test-lead-a4ankit27";
await setDoc(doc(db, "leads", leadId), {
  id: leadId,
  userId,
  leadType: "residential",
  dateAdded: new Date().toISOString().slice(0, 10),
  source: "Other",
  dealType: "Wholesale",
  address: "123 Test St, Testville, TX 75000",
  sellerName: "Test Lead",
  email: "a4ankit27@gmail.com",
  phone: "555-000-0000",
  notes: "Seeded by scripts/seed-test-lead.mjs for local automation testing — safe to delete.",
  offerStatus: "Not Sent",
  sellerAccepted: "No",
});

console.log(
  `Seeded test lead "${leadId}" (email: a4ankit27@gmail.com) for user ${userId}.`,
);
console.log('Open it in the CRM (Leads) and click "Run Automation" to start the sequence.');
process.exit(0);
