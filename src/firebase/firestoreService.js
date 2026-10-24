import { initializeApp } from "firebase/app";
import {
  arrayUnion,
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
const titleCompaniesCollection = collection(db, "titleCompanies");
const rentalsCollection = collection(db, "rentals");
const invoicesCollection = collection(db, "invoices");
const countyRecordImportsCollection = collection(db, "countyRecordImports");

function leadFilesSubcollection(leadId) {
  return collection(db, "leads", leadId, "files");
}

function contractsSubcollection(dealId) {
  return collection(db, "properties", dealId, "contracts");
}

function leadPhotosSubcollection(leadId) {
  return collection(db, "leads", leadId, "photos");
}

function dealPhotosSubcollection(dealId) {
  return collection(db, "properties", dealId, "photos");
}

function pmDealFilesSubcollection(pmDealId) {
  return collection(db, "pmDeals", pmDealId, "files");
}

function countyRecordChunksSubcollection(importId) {
  return collection(db, "countyRecordImports", importId, "chunks");
}

// Comps run on a county record, one document per record (by its position
// in the file), so the record chunks themselves aren't rewritten.
function countyRecordCompsSubcollection(importId) {
  return collection(db, "countyRecordImports", importId, "comps");
}

// Attachment documents (contracts, lead and PM deal files) hold the file
// as a data URL. Firestore caps a document at 1 MB, so a larger file is
// split: its document keeps the details with `chunkCount`, and the data
// sits in sibling documents "<id>~0", "<id>~1"… in the same collection
// (which deleting the whole collection already clears).
const FILE_CHUNK_LENGTH = 700 * 1024;

const chunkId = (id, index) => `${id}~${index}`;

async function saveFileDoc(files, id, fields) {
  const data = fields.data || "";
  if (data.length <= FILE_CHUNK_LENGTH) {
    await setDoc(doc(files, id), fields);
    return;
  }
  const chunkCount = Math.ceil(data.length / FILE_CHUNK_LENGTH);
  await Promise.all(
    Array.from({ length: chunkCount }, (_, index) =>
      setDoc(doc(files, chunkId(id, index)), {
        ...fields,
        id: chunkId(id, index),
        chunkOf: id,
        index,
        data: data.slice(
          index * FILE_CHUNK_LENGTH,
          (index + 1) * FILE_CHUNK_LENGTH,
        ),
      }),
    ),
  );
  // Written last, so the file only shows as saved once all its parts are.
  await setDoc(doc(files, id), { ...fields, data: "", chunkCount });
}

async function fetchFileDoc(files, id) {
  const snapshot = await getDoc(doc(files, id));
  if (!snapshot.exists()) return null;
  const file = { id: snapshot.id, ...snapshot.data() };
  if (!file.chunkCount) return file;
  const chunks = await Promise.all(
    Array.from({ length: file.chunkCount }, (_, index) =>
      getDoc(doc(files, chunkId(id, index))),
    ),
  );
  if (chunks.some((c) => !c.exists())) {
    throw new Error(`Part of "${file.name}" is missing.`);
  }
  return { ...file, data: chunks.map((c) => c.data().data).join("") };
}

async function deleteFileDoc(files, id) {
  const snapshot = await getDoc(doc(files, id));
  const chunkCount = snapshot.exists() ? snapshot.data().chunkCount || 0 : 0;
  await Promise.all(
    Array.from({ length: chunkCount }, (_, index) =>
      deleteDoc(doc(files, chunkId(id, index))),
    ),
  );
  await deleteDoc(doc(files, id));
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
      let emailFailed = false;
      try {
        await sendActivationEmail({
          userId: existingUser.id,
          email: normalizedEmail,
        });
      } catch {
        emailFailed = true;
      }
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
        emailFailed,
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
  let emailFailed = false;
  try {
    await sendActivationEmail({
      userId: user.id,
      email: normalizedEmail,
    });
  } catch {
    emailFailed = true;
  }

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    profileImage: user.profileImage || "",
    role: user.role,
    active: user.active,
    emailFailed,
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
    // Photo data lives in the photos subcollection; the deal keeps the list.
    ...(Array.isArray(property.photos) && {
      photos: property.photos.map(({ data, ...rest }) => rest),
    }),
  };
  await setDoc(propertyRef, normalized);
  return normalized;
}

export async function deleteDealById(id) {
  const [contractsSnapshot, photosSnapshot] = await Promise.all([
    getDocs(contractsSubcollection(id)),
    getDocs(dealPhotosSubcollection(id)),
  ]);
  await Promise.all(
    [...contractsSnapshot.docs, ...photosSnapshot.docs].map((d) =>
      deleteDoc(d.ref),
    ),
  );
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
  await saveFileDoc(contractsSubcollection(dealId), id, {
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
  return fetchFileDoc(contractsSubcollection(dealId), id);
}

export async function deleteContractById(dealId, id) {
  await deleteFileDoc(contractsSubcollection(dealId), id);
}

// Deal photos: one compressed JPEG data URL per document, like contracts.
export async function saveDealPhoto({ id, dealId, userId, data, uploadedAt }) {
  await setDoc(doc(dealPhotosSubcollection(dealId), id), {
    id,
    dealId,
    userId,
    data,
    uploadedAt,
  });
}

export async function fetchDealPhoto(dealId, id) {
  const snapshot = await getDoc(doc(dealPhotosSubcollection(dealId), id));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

export async function deleteDealPhotoById(dealId, id) {
  await deleteDoc(doc(dealPhotosSubcollection(dealId), id));
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
  // Photos are their own documents; don't leave them behind.
  const photos = await getDocs(leadPhotosSubcollection(id)).catch(() => null);
  await Promise.all((photos?.docs || []).map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(leadsCollection, id));
}

// Saves only the given fields of a lead, e.g. { photos } as they change.
export async function updateLeadPatch(id, fields) {
  await updateDoc(doc(leadsCollection, id), fields);
}

// Lead photos: one compressed JPEG data URL per document, like deal photos.
export async function saveLeadPhoto({ id, leadId, userId, data, uploadedAt }) {
  await setDoc(doc(leadPhotosSubcollection(leadId), id), {
    id,
    leadId,
    userId,
    data,
    uploadedAt,
  });
}

export async function fetchLeadPhoto(leadId, id) {
  const snapshot = await getDoc(doc(leadPhotosSubcollection(leadId), id));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

export async function deleteLeadPhotoById(leadId, id) {
  await deleteDoc(doc(leadPhotosSubcollection(leadId), id));
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
  await saveFileDoc(leadFilesSubcollection(leadId), id, {
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
  return fetchFileDoc(leadFilesSubcollection(leadId), id);
}

export async function deleteLeadFileById(leadId, id) {
  await deleteFileDoc(leadFilesSubcollection(leadId), id);
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

export async function fetchTitleCompanies(userId) {
  const snapshot = userId
    ? await getDocs(
        query(titleCompaniesCollection, where("userId", "==", userId)),
      )
    : await getDocs(titleCompaniesCollection);
  return mapSnapshot(snapshot);
}

export async function saveTitleCompany(company) {
  await setDoc(doc(titleCompaniesCollection, company.id), company);
}

export async function deleteTitleCompanyById(id) {
  await deleteDoc(doc(titleCompaniesCollection, id));
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
  await saveFileDoc(pmDealFilesSubcollection(pmDealId), id, {
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
  return fetchFileDoc(pmDealFilesSubcollection(pmDealId), id);
}

export async function deletePmDealFileById(pmDealId, id) {
  await deleteFileDoc(pmDealFilesSubcollection(pmDealId), id);
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

// ── County records ──────────────────────────────────────────────────────
// An import is a summary doc (file name, columns, row count) plus its rows
// split across "chunks" subcollection docs, each a JSON string of rows kept
// under Firestore's 1MB document limit. The summary is written last, so an
// import that fails partway never shows up in the list.

export async function fetchCountyRecordImports(userId) {
  const snapshot = await getDocs(
    query(countyRecordImportsCollection, where("userId", "==", userId)),
  );
  return mapSnapshot(snapshot);
}

export async function saveCountyRecordImport(summary, chunks) {
  const chunkRefs = chunks.map((_, index) =>
    doc(countyRecordChunksSubcollection(summary.id), String(index)),
  );
  try {
    for (let index = 0; index < chunks.length; index += 1) {
      await setDoc(chunkRefs[index], { index, rows: chunks[index] });
    }
    await setDoc(doc(countyRecordImportsCollection, summary.id), {
      ...summary,
      chunkCount: chunks.length,
    });
  } catch (error) {
    await Promise.all(chunkRefs.map((ref) => deleteDoc(ref).catch(() => {})));
    throw error;
  }
}

// Resolves with every row of the import, in file order.
export async function fetchCountyRecordRows(importId) {
  const snapshot = await getDocs(countyRecordChunksSubcollection(importId));
  return snapshot.docs
    .map((d) => d.data())
    .sort((a, b) => a.index - b.index)
    .flatMap((chunk) => JSON.parse(chunk.rows));
}

// e.g. { name } when a list is renamed.
export async function updateCountyRecordImport(importId, fields) {
  await updateDoc(doc(countyRecordImportsCollection, importId), fields);
}

// Deleting single records doesn't rewrite the (large) row chunks: the
// import lists the deleted rows' positions in the file, and they're
// skipped when shown. One write per delete, whatever the file size.
export async function deleteCountyRecordRows(importId, rowIndexes) {
  await updateDoc(doc(countyRecordImportsCollection, importId), {
    deletedRows: arrayUnion(...rowIndexes),
    rowCount: increment(-rowIndexes.length),
  });
}

// Firestore's limit for one document is 1 MiB; leave room for the fields.
const MAX_CHUNK_DOC_BYTES = 1_000_000;

// Replaces one record (by its position in the file) with `row`. Only the
// chunk holding it is rewritten. Throws when the edited chunk would no
// longer fit in a document.
export async function updateCountyRecordRow(importId, rowIndex, row) {
  const snapshot = await getDocs(countyRecordChunksSubcollection(importId));
  const chunks = snapshot.docs
    .map((d) => ({ ref: d.ref, ...d.data() }))
    .sort((a, b) => a.index - b.index);
  let start = 0;
  for (const chunk of chunks) {
    const rows = JSON.parse(chunk.rows);
    if (rowIndex < start + rows.length) {
      rows[rowIndex - start] = row;
      const json = JSON.stringify(rows);
      if (new TextEncoder().encode(json).length > MAX_CHUNK_DOC_BYTES) {
        throw new Error("This record is too large to save.");
      }
      await updateDoc(chunk.ref, { rows: json });
      return;
    }
    start += rows.length;
  }
  throw new Error("Couldn't find this record in the list.");
}

// { compsResult, note } for a record, or null when comps haven't been run.
export async function fetchCountyRecordComps(importId, rowIndex) {
  const snap = await getDoc(
    doc(countyRecordCompsSubcollection(importId), String(rowIndex)),
  );
  return snap.exists() ? snap.data() : null;
}

export async function saveCountyRecordComps(importId, rowIndex, comps) {
  await setDoc(
    doc(countyRecordCompsSubcollection(importId), String(rowIndex)),
    { rowIndex, ...comps },
  );
}

export async function deleteCountyRecordImportById(importId) {
  const [chunks, comps] = await Promise.all([
    getDocs(countyRecordChunksSubcollection(importId)),
    getDocs(countyRecordCompsSubcollection(importId)),
  ]);
  await Promise.all(
    [...chunks.docs, ...comps.docs].map((d) => deleteDoc(d.ref)),
  );
  await deleteDoc(doc(countyRecordImportsCollection, importId));
}
