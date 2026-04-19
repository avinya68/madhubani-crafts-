// auth.js — Firebase Auth: Google + email/password, session state, login modal

import { Cart } from './cart.js';

let _auth = null;
let _user = null;
let _authReady = false;
let _authResolvers = [];

async function getAuth() {
  if (_auth) return _auth;
  try {
    const { auth, isFirebaseConfigured } = await import('./firebase-config.js');
    if (!isFirebaseConfigured || !auth) return null;
    _auth = auth;
    return _auth;
  } catch { return null; }
}

export async function initAuth() {
  const auth = await getAuth();
  if (!auth) {
    _markAuthReady();
    return;
  }
  const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
  onAuthStateChanged(auth, async user => {
    _user = user;
    await Cart.onAuthChange(user ? user.uid : null);
    _updateUI(user);
    document.dispatchEvent(new CustomEvent("mc:auth-changed", { detail: { user } }));
    _markAuthReady();
  });
}

function _updateUI(user) {
  if (user) {
    document.body.classList.add("authed");
    document.querySelectorAll(".user-name-display").forEach(el => {
      el.textContent = user.displayName || user.email?.split("@")[0] || "You";
    });
  } else {
    document.body.classList.remove("authed");
    document.querySelectorAll(".user-name-display").forEach(el => {
      el.textContent = "";
    });
  }
}

export async function signInGoogle() {
  const auth = await getAuth();
  if (!auth) { alert("Firebase not connected."); return; }
  const { GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
  try {
    const cred = await signInWithPopup(auth, new GoogleAuthProvider());
    await _saveUserProfile(cred.user, { role: "customer" });
    closeLoginModal();
  } catch (e) { _showErr(e.message); }
}

export async function signInEmail(email, pass) {
  const auth = await getAuth();
  if (!auth) return;
  const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await _saveUserProfile(cred.user, { role: "customer" });
    closeLoginModal();
  } catch (e) { _showErr(_friendly(e.code)); }
}

export async function registerEmail(email, pass, name) {
  const auth = await getAuth();
  if (!auth) return;
  const { createUserWithEmailAndPassword, updateProfile } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name) await updateProfile(cred.user, { displayName: name });
    await _saveUserProfile(cred.user, { role: "customer", name, email: cred.user.email || email });
    closeLoginModal();
  } catch (e) { _showErr(_friendly(e.code)); }
}

async function _saveUserProfile(user, extra = {}) {
  try {
    const { db } = await import('./firebase-config.js');
    if (!db) return;
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await setDoc(doc(db, "users", user.uid), {
      name: user.displayName || extra.name || "",
      email: user.email || extra.email || "",
      role: extra.role || "customer"
    }, { merge: true });
  } catch {}
}

export async function signOut() {
  const auth = await getAuth();
  if (!auth) return;
  const { signOut: so } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
  await so(auth);
}

export function getCurrentUser() { return _user; }

export function whenAuthReady() {
  if (_authReady) return Promise.resolve(_user);
  return new Promise(resolve => _authResolvers.push(resolve));
}

export async function getUserProfile(uid = _user?.uid) {
  if (!uid) return null;
  try {
    const { db } = await import('./firebase-config.js');
    if (!db) return null;
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

export async function saveUserProfile(data) {
  if (!_user) return;
  try {
    const { db } = await import('./firebase-config.js');
    if (!db) return;
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await setDoc(doc(db, "users", _user.uid), {
      ...data,
      name: data.name || _user.displayName || "",
      email: data.email || _user.email || "",
      role: data.role || "customer"
    }, { merge: true });
  } catch {}
}

export async function isAdmin() {
  if (!_user) return false;
  try {
    const { db } = await import('./firebase-config.js');
    if (!db) return false;
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(doc(db, "users", _user.uid));
    return snap.exists() && snap.data().role === "admin";
  } catch { return false; }
}

// ── Login Modal ──
export function injectLoginModal() {
  document.body.insertAdjacentHTML("beforeend", `
    <div id="login-overlay">
      <div class="login-modal">
        <button class="login-modal-close" id="login-modal-close">✕</button>
        <h2>Welcome back</h2>
        <p>Sign in to save your cart & track orders</p>

        <button class="btn-google" id="btn-google">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G"/>
          Continue with Google
        </button>

        <div class="auth-divider">or</div>

        <div id="login-form-wrap">
          <form class="auth-form" id="login-form">
            <div><label>Email</label><input type="email" name="email" required placeholder="you@email.com"/></div>
            <div><label>Password</label><input type="password" name="password" required placeholder="••••••••"/></div>
            <div class="auth-error" id="auth-error"></div>
            <button type="submit" class="btn-auth-submit">Sign In</button>
          </form>
          <div class="auth-switch">No account? <a id="to-register">Register</a></div>
        </div>

        <div id="register-form-wrap" style="display:none">
          <form class="auth-form" id="register-form">
            <div><label>Name</label><input type="text" name="name" required placeholder="Your name"/></div>
            <div><label>Email</label><input type="email" name="email" required placeholder="you@email.com"/></div>
            <div><label>Password</label><input type="password" name="password" required placeholder="Min. 6 chars"/></div>
            <div class="auth-error" id="auth-error-reg"></div>
            <button type="submit" class="btn-auth-submit">Create Account</button>
          </form>
          <div class="auth-switch">Have an account? <a id="to-login">Sign in</a></div>
        </div>
      </div>
    </div>
  `);

  document.getElementById("login-modal-close").addEventListener("click", closeLoginModal);
  document.getElementById("login-overlay").addEventListener("click", e => { if (e.target.id === "login-overlay") closeLoginModal(); });
  document.getElementById("btn-google").addEventListener("click", signInGoogle);

  document.getElementById("login-form").addEventListener("submit", async e => {
    e.preventDefault();
    await signInEmail(e.target.email.value, e.target.password.value);
  });
  document.getElementById("register-form").addEventListener("submit", async e => {
    e.preventDefault();
    await registerEmail(e.target.email.value, e.target.password.value, e.target.name.value);
  });

  document.getElementById("to-register").addEventListener("click", () => {
    document.getElementById("login-form-wrap").style.display = "none";
    document.getElementById("register-form-wrap").style.display = "block";
    _resetErrors();
  });
  document.getElementById("to-login").addEventListener("click", () => {
    document.getElementById("register-form-wrap").style.display = "none";
    document.getElementById("login-form-wrap").style.display = "block";
    _resetErrors();
  });

  document.querySelectorAll("[data-open-login]").forEach(el => el.addEventListener("click", e => {
    e.preventDefault();
    openLoginModal();
  }));
  document.querySelectorAll("[data-signout]").forEach(el => el.addEventListener("click", async e => {
    e.preventDefault();
    await signOut();
  }));
}

export function openLoginModal() {
  document.getElementById("login-overlay")?.classList.add("open");
  document.body.style.overflow = "hidden";
}
export function closeLoginModal() {
  document.getElementById("login-overlay")?.classList.remove("open");
  document.body.style.overflow = "";
  _resetErrors();
}

function _showErr(msg) {
  ["auth-error","auth-error-reg"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = "block"; }
  });
}

function _resetErrors() {
  ["auth-error","auth-error-reg"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = "";
      el.style.display = "none";
    }
  });
}

function _markAuthReady() {
  if (_authReady) return;
  _authReady = true;
  _authResolvers.forEach(resolve => resolve(_user));
  _authResolvers = [];
}

function _friendly(code) {
  return {
    "auth/wrong-password": "Incorrect password.",
    "auth/user-not-found": "No account with that email.",
    "auth/email-already-in-use": "Email already registered — try signing in.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email.",
    "auth/popup-closed-by-user": "Sign-in cancelled.",
  }[code] || "Something went wrong. Try again.";
}
