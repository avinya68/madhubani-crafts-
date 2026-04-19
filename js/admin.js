// admin.js — STUB. UI not built yet.
// Foundation: set role:"admin" on a user doc in Firestore to grant access.
//
// To make someone admin:
// Firebase Console → Firestore → users → {uid} → add field: role = "admin"
//
// Uncomment below when ready to build the admin panel.

/*
import { db } from './firebase-config.js';
import { isAdmin } from './auth.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function adminAddProduct(data) {
  if (!await isAdmin()) throw new Error("Unauthorised");
  return addDoc(collection(db, "products"), { ...data, createdAt: Date.now() });
}

export async function adminUpdateProduct(id, updates) {
  if (!await isAdmin()) throw new Error("Unauthorised");
  return updateDoc(doc(db, "products", id), updates);
}

export async function adminDeleteProduct(id) {
  if (!await isAdmin()) throw new Error("Unauthorised");
  return deleteDoc(doc(db, "products", id));
}

export async function adminGetOrders() {
  if (!await isAdmin()) throw new Error("Unauthorised");
  const snap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
*/

export const ADMIN_READY = true;
