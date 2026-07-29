import { initializeApp } from "firebase/app";
import {
  collection,
  getDoc,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  increment,
  limit,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const propertiesCollection = collection(db, "properties");
const buyersCollection = collection(db, "buyers");
const usersCollection = collection(db, "users");
const leadsCollection = collection(db, "leads");
const passwordResetsCollection = collection(db, "passwordResets");
const accountActivationsCollection = collection(db, "accountActivations");
const pmDealsCollection = collection(db, "pmDeals");
const rentalsCollection = collection(db, "rentals");
const invoicesCollection = collection(db, "invoices");

function leadFilesSubcollection(leadId) {
  return collection(db, "leads", leadId, "files");
}

function contractsSubcollection(dealId) {
  return collection(db, "properties", dealId, "contracts");
}

function pmDealFilesSubcollection(pmDealId) {
  return collection(db, "pmDeals", pmDealId, "files");
}

function mapSnapshot(snapshot) {
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(password),
  );
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function stripContractData(versions) {
  if (!Array.isArray(versions)) return [];
  return versions.map(({ data, downloadURL, storagePath, ...rest }) => rest);
}

function activationUrl(token) {
  if (typeof window === "undefined") return token;
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("activate", token);
  return url.toString();
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sendBrevoEmail({ toEmail, subject, textContent }) {
  const payload = JSON.stringify({
    toEmail,
    subject,
    textContent,
  });
  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  };
  let res = await fetch("/api/send-email", requestOptions);
  const isLocalhost =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);

  if (res.status === 404 && isLocalhost) {
    try {
      res = await fetch("http://localhost:3001/api/send-email", requestOptions);
    } catch {
      throw new Error(
        "Local email API is not running. Stop the server and run npm run dev so localhost:3001 starts.",
      );
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 404) {
      throw new Error(
        "Email API route was not found. For local testing, stop the server and run npm run dev so the API server starts.",
      );
    }
    throw new Error(
      err.error || err.message || `Failed to send email (HTTP ${res.status})`,
    );
  }
}

async function sendActivationEmail({ userId, email }) {
  const token = randomToken();
  const oldActivations = await getDocs(
    query(accountActivationsCollection, where("email", "==", email)),
  );

  await Promise.all(oldActivations.docs.map((snap) => deleteDoc(snap.ref)));
  await setDoc(doc(accountActivationsCollection, token), {
    token,
    userId,
    email,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    used: false,
  });

  const link = activationUrl(token);
  await sendBrevoEmail({
    toEmail: email,
    subject: "Activate your You Win Estates CRM account",
    textContent: `Welcome to You Win Estates CRM.\n\nActivate your account here:\n${link}\n\nThis link expires in 7 days.`,
  });
}

export async function createUserAccount({
  firstName,
  lastName,
  username,
  email,
  password,
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();
  const existingUsers = await getDocs(
    query(usersCollection, where("email", "==", normalizedEmail), limit(1)),
  );

  if (!existingUsers.empty) {
    const existingUser = {
      id: existingUsers.docs[0].id,
      ...existingUsers.docs[0].data(),
    };
    if (existingUser.active === false) {
      await sendActivationEmail({
        userId: existingUser.id,
        email: normalizedEmail,
      });
      return {
        id: existingUser.id,
        firstName: existingUser.firstName || "",
        lastName: existingUser.lastName || "",
        username: existingUser.username || "",
        email: normalizedEmail,
        profileImage: existingUser.profileImage || "",
        role: existingUser.role || "ppc",
        active: false,
        resentActivation: true,
      };
    }
    throw new Error("An account with this email already exists.");
  }

  const existingUsernames = await getDocs(
    query(
      usersCollection,
      where("username", "==", normalizedUsername),
      limit(1),
    ),
  );

  if (!existingUsernames.empty) {
    throw new Error("An account with this username already exists.");
  }

  const user = {
    id: crypto.randomUUID(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    username: normalizedUsername,
    email: normalizedEmail,
    profileImage: "",
    passwordHash: await hashPassword(password),
    role: "ppc",
    active: false,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(usersCollection, user.id), user);
  await sendActivationEmail({
    userId: user.id,
    email: normalizedEmail,
  });

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    profileImage: user.profileImage || "",
    role: user.role,
    active: user.active,
  };
}

export async function activateUserAccount(token) {
  const normalizedToken = token.trim();
  const activationRef = doc(accountActivationsCollection, normalizedToken);
  const activationSnap = await getDoc(activationRef);

  if (!activationSnap.exists()) {
    throw new Error("Activation link is invalid or has already been used.");
  }

  const activation = activationSnap.data();
  if (activation.used) {
    throw new Error("Activation link has already been used.");
  }
  if (Date.now() > activation.expiresAt) {
    throw new Error("Activation link expired. Please sign up again.");
  }

  await setDoc(
    doc(usersCollection, activation.userId),
    { active: true, activatedAt: new Date().toISOString() },
    { merge: true },
  );
  await deleteDoc(activationRef);
}

export async function signInUser({ username, password }) {
  const normalizedUsername = username.trim().toLowerCase();
  const allUsers = await Promise.race([
    getDocs(usersCollection),
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error("Connection timed out. Check Firebase configuration."),
          ),
        10000,
      ),
    ),
  ]);
  const user = allUsers.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .find(
      (u) =>
        (u.username || "").toLowerCase() === normalizedUsername ||
        (u.email || "").toLowerCase() === normalizedUsername,
    );

  if (!user) {
    throw new Error("Incorrect username or password.");
  }

  const passwordHash = await hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    throw new Error("Incorrect username or password.");
  }

  if (user.active === false) {
    throw new Error("Please activate your account from the email we sent you.");
  }

  return {
    id: user.id,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    username: user.username,
    email: user.email,
    profileImage: user.profileImage || "",
    role: user.role || "admin",
    active: user.active !== false,
  };
}

export async function updateUserProfile({
  id,
  firstName,
  lastName,
  profileImage,
}) {
  const userRef = doc(usersCollection, id);
  await setDoc(
    userRef,
    {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      profileImage: profileImage || "",
    },
    { merge: true },
  );

  return {
    id,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    profileImage: profileImage || "",
  };
}

export async function fetchDeals(userId) {
  const snapshot = userId
    ? await getDocs(query(propertiesCollection, where("userId", "==", userId)))
    : await getDocs(propertiesCollection);
  return mapSnapshot(snapshot);
}

export async function saveDeal(property) {
  const propertyRef = doc(propertiesCollection, property.id);
  const normalized = {
    ...property,
    contractVersions: stripContractData(property.contractVersions),
    contractFileData: "",
  };
  await setDoc(propertyRef, normalized);
  return normalized;
}

export async function deleteDealById(id) {
  const contractsSnapshot = await getDocs(contractsSubcollection(id));
  await Promise.all(contractsSnapshot.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(propertiesCollection, id));
}

export async function saveContractVersion({
  id,
  dealId,
  userId,
  name,
  type,
  data,
  uploadedAt,
}) {
  await setDoc(doc(contractsSubcollection(dealId), id), {
    id,
    dealId,
    userId,
    name,
    type,
    data,
    uploadedAt,
  });
}

export async function fetchContractVersion(dealId, id) {
  const snapshot = await getDoc(doc(contractsSubcollection(dealId), id));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

export async function deleteContractById(dealId, id) {
  await deleteDoc(doc(contractsSubcollection(dealId), id));
}

export async function fetchBuyers(userId) {
  const snapshot = userId
    ? await getDocs(query(buyersCollection, where("userId", "==", userId)))
    : await getDocs(buyersCollection);
  return mapSnapshot(snapshot);
}

export async function saveBuyer(buyer) {
  const buyerRef = doc(buyersCollection, buyer.id);
  await setDoc(buyerRef, buyer);
}

export async function deleteBuyerById(id) {
  const buyerRef = doc(buyersCollection, id);
  await deleteDoc(buyerRef);
}

export async function fetchLeads(userId) {
  const snapshot = userId
    ? await getDocs(query(leadsCollection, where("userId", "==", userId)))
    : await getDocs(leadsCollection);
  return mapSnapshot(snapshot);
}

// Returns an unsubscribe function; calls onData whenever leads change in Firestore
export function subscribeToLeads(userId, onData, onError) {
  const q = userId
    ? query(leadsCollection, where("userId", "==", userId))
    : leadsCollection;
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => d.data())),
    onError ?? (() => {}),
  );
}

export async function saveLead(lead) {
  await setDoc(doc(leadsCollection, lead.id), lead);
}

export async function deleteLeadById(id) {
  await deleteDoc(doc(leadsCollection, id));
}

const userStatsCollection = collection(db, "userStats");

export async function fetchUserStats(userId) {
  const snap = await getDoc(doc(userStatsCollection, userId));
  return snap.exists() ? snap.data() : {};
}

export async function incrementPpcDeleted(userId, by = 1) {
  const ref = doc(userStatsCollection, userId);
  try {
    await updateDoc(ref, { ppcDeletedCount: increment(by) });
  } catch {
    await setDoc(ref, { ppcDeletedCount: by }, { merge: true });
  }
}

export async function saveLeadFile({
  id,
  leadId,
  userId,
  name,
  type,
  data,
  uploadedAt,
}) {
  await setDoc(doc(leadFilesSubcollection(leadId), id), {
    id,
    leadId,
    userId,
    name,
    type,
    data,
    uploadedAt,
  });
}

export async function fetchLeadFile(leadId, id) {
  const snapshot = await getDoc(doc(leadFilesSubcollection(leadId), id));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

export async function deleteLeadFileById(leadId, id) {
  await deleteDoc(doc(leadFilesSubcollection(leadId), id));
}

export async function fetchPmDeals(userId) {
  const snapshot = userId
    ? await getDocs(query(pmDealsCollection, where("userId", "==", userId)))
    : await getDocs(pmDealsCollection);
  return mapSnapshot(snapshot);
}

export async function savePmDeal(deal) {
  const dealRef = doc(pmDealsCollection, deal.id);
  await setDoc(dealRef, deal);
  return deal;
}

export async function deletePmDealById(id) {
  const filesSnapshot = await getDocs(pmDealFilesSubcollection(id));
  await Promise.all(filesSnapshot.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(pmDealsCollection, id));
}

export async function fetchRentals(userId) {
  const snapshot = userId
    ? await getDocs(query(rentalsCollection, where("userId", "==", userId)))
    : await getDocs(rentalsCollection);
  return mapSnapshot(snapshot);
}

export async function saveRental(rental) {
  await setDoc(doc(rentalsCollection, rental.id), rental);
  return rental;
}

export async function deleteRentalById(id) {
  await deleteDoc(doc(rentalsCollection, id));
}

export async function savePmDealFile({
  id,
  pmDealId,
  userId,
  name,
  type,
  data,
  uploadedAt,
}) {
  await setDoc(doc(pmDealFilesSubcollection(pmDealId), id), {
    id,
    pmDealId,
    userId,
    name,
    type,
    data,
    uploadedAt,
  });
}

export async function fetchPmDealFile(pmDealId, id) {
  const snapshot = await getDoc(doc(pmDealFilesSubcollection(pmDealId), id));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

export async function deletePmDealFileById(pmDealId, id) {
  await deleteDoc(doc(pmDealFilesSubcollection(pmDealId), id));
}

export async function sendPasswordResetOtp(email) {
  const normalizedEmail = email.trim().toLowerCase();

  // Don't reveal whether the email exists — just attempt the reset.
  // confirmPasswordReset will fail gracefully if the email isn't registered.
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 15 * 60 * 1000;
  await setDoc(doc(passwordResetsCollection, normalizedEmail), {
    otp,
    expiresAt,
    used: false,
  });

  await sendBrevoEmail({
    toEmail: normalizedEmail,
    subject: "Your password reset code",
    textContent: `Your one-time reset code is: ${otp}\n\nThis code expires in 15 minutes. If you did not request this, ignore this email.`,
  });
}

export async function confirmPasswordReset(email, otp, newPassword) {
  const normalizedEmail = email.trim().toLowerCase();
  const resetSnap = await getDoc(
    doc(passwordResetsCollection, normalizedEmail),
  );
  if (!resetSnap.exists())
    throw new Error("No reset request found. Please request a new code.");

  const { otp: stored, expiresAt, used } = resetSnap.data();
  if (used)
    throw new Error(
      "This code has already been used. Please request a new one.",
    );
  if (Date.now() > expiresAt)
    throw new Error("Code expired. Please request a new one.");
  if (otp.trim() !== stored)
    throw new Error("Incorrect code. Please try again.");

  const userSnap = await getDocs(
    query(usersCollection, where("email", "==", normalizedEmail), limit(1)),
  );
  if (userSnap.empty) throw new Error("Account not found.");

  const newHash = await hashPassword(newPassword);
  const userRef = doc(usersCollection, userSnap.docs[0].id);
  await setDoc(userRef, { passwordHash: newHash }, { merge: true });
  await setDoc(
    doc(passwordResetsCollection, normalizedEmail),
    { used: true },
    { merge: true },
  );
}

export async function saveInvoice(invoice) {
  const invoiceRef = doc(invoicesCollection, invoice.id);
  await setDoc(invoiceRef, invoice);
}

export async function fetchInvoices(userId) {
  const snapshot = await getDocs(
    query(invoicesCollection, where("userId", "==", userId)),
  );
  return mapSnapshot(snapshot);
}

export async function deleteInvoiceById(id) {
  await deleteDoc(doc(invoicesCollection, id));
}

const scheduledPaymentsCollection = collection(db, "scheduledPayments");

export async function saveScheduledPayment(payment) {
  await setDoc(doc(scheduledPaymentsCollection, payment.id), payment);
}

export async function fetchScheduledPayments(userId) {
  const snapshot = await getDocs(
    query(scheduledPaymentsCollection, where("userId", "==", userId)),
  );
  return mapSnapshot(snapshot);
}

export async function updateScheduledPaymentStatus(id, status) {
  await updateDoc(doc(scheduledPaymentsCollection, id), {
    status,
    sentAt: status === "sent" ? new Date().toISOString() : null,
  });
}

export async function deleteScheduledPaymentById(id) {
  await deleteDoc(doc(scheduledPaymentsCollection, id));
}
