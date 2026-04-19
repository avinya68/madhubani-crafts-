// ─────────────────────────────────────────────
//  FIREBASE CONFIGURATION
//  Replace the values below with your own keys.
//  Get them from: Firebase Console → Project Settings → Your Apps → Web
// ─────────────────────────────────────────────

const firebaseConfig = {
  apiKey: "AIzaSyAegvi13uZsuJ5u5FexGKROIYRhtlQT6x8",
  authDomain: "ecomm-store-e65b5.firebaseapp.com",
  projectId: "ecomm-store-e65b5",
  storageBucket: "ecomm-store-e65b5.firebasestorage.app",
  messagingSenderId: "655940149334",
  appId: "1:655940149334:web:ccbaadefb4d3eb76899bf7"
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  value => typeof value === "string" && value.trim() !== "" && !value.startsWith("YOUR_")
);

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
  const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
  const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db, firebaseConfig };
