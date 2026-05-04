import { initializeApp } from "firebase/app";
import {
  collection,
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

export async function createUserAccount({ username, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUsers = await getDocs(
    query(usersCollection, where("email", "==", normalizedEmail), limit(1)),
  );

  if (!existingUsers.empty) {
    throw new Error("An account with this email already exists.");
  }

  const user = {
    id: crypto.randomUUID(),
    username: username.trim(),
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
  };

  await setDoc(doc(usersCollection, user.id), user);

  return {
    id: user.id,
    username: user.username,
    email: user.email,
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
    username: user.username,
    email: user.email,
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
  await setDoc(propertyRef, property);
}

export async function deleteDealById(id) {
  const propertyRef = doc(propertiesCollection, id);
  await deleteDoc(propertyRef);
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
