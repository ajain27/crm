import { initializeApp } from "firebase/app";
import {
  collection,
  getDoc,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  query,
  setDoc,
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

function contractsSubcollection(dealId) {
  return collection(db, "properties", dealId, "contracts");
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

export async function createUserAccount({
  firstName,
  lastName,
  username,
  email,
  password,
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUsers = await getDocs(
    query(usersCollection, where("email", "==", normalizedEmail), limit(1)),
  );

  if (!existingUsers.empty) {
    throw new Error("An account with this email already exists.");
  }

  const user = {
    id: crypto.randomUUID(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    username: username.trim(),
    email: normalizedEmail,
    profileImage: "",
    passwordHash: await hashPassword(password),
  };

  await setDoc(doc(usersCollection, user.id), user);

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    profileImage: user.profileImage || "",
  };
}

export async function signInUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const matchingUsers = await getDocs(
    query(usersCollection, where("email", "==", normalizedEmail), limit(1)),
  );

  const [user] = mapSnapshot(matchingUsers);
  if (!user) {
    throw new Error("No account found for that email.");
  }

  const passwordHash = await hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    throw new Error("Incorrect password.");
  }

  return {
    id: user.id,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    username: user.username,
    email: user.email,
    profileImage: user.profileImage || "",
  };
}

export async function updateUserProfile({ id, firstName, lastName, profileImage }) {
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

export async function saveContractVersion({ id, dealId, userId, name, type, data, uploadedAt }) {
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
