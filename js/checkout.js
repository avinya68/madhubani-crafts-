// checkout.js — WhatsApp order builder + Firestore order save

import { Cart } from './cart.js';
import { getCurrentUser, getUserProfile, saveUserProfile, whenAuthReady } from './auth.js';

const WA_NUMBER = "919650077991";

export function initCheckout() {
  const form = document.getElementById("checkout-form");
  if (!form) return;

  _renderSummary();
  Cart.onChange(_renderSummary);
  _syncCustomerDetails(form);

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!_validate(form)) return;

    const items = await Cart.items();
    if (!items.length) { alert("Your cart is empty."); return; }

    const d = {
      name:    form.querySelector('[name="name"]').value.trim(),
      phone:   form.querySelector('[name="phone"]').value.trim(),
      email:   form.querySelector('[name="email"]')?.value.trim() || "",
      address: form.querySelector('[name="address"]').value.trim(),
      area:    form.querySelector('[name="area"]')?.value.trim() || "",
      city:    form.querySelector('[name="city"]').value.trim(),
      state:   form.querySelector('[name="state"]').value.trim(),
      pin:     form.querySelector('[name="pincode"]').value.trim(),
      note:    form.querySelector('[name="note"]')?.value.trim() || "",
    };

    const total = Cart.total(items);
    const msg   = _buildMsg({ ...d, items, total });

    await _saveCustomerProfile(d);
    await _saveOrder({ ...d, items, total });
    await Cart.clear();

    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    window.location.href = "index.html?order=success";
  });
}

async function _syncCustomerDetails(form) {
  await whenAuthReady();
  await _prefillCustomerDetails(form);

  document.addEventListener("mc:auth-changed", async () => {
    await _prefillCustomerDetails(form);
  });
}

async function _prefillCustomerDetails(form) {
  const user = getCurrentUser();
  const emailInput = form.querySelector('[name="email"]');
  const nameInput = form.querySelector('[name="name"]');
  const phoneInput = form.querySelector('[name="phone"]');
  const addressInput = form.querySelector('[name="address"]');
  const areaInput = form.querySelector('[name="area"]');
  const cityInput = form.querySelector('[name="city"]');
  const stateInput = form.querySelector('[name="state"]');
  const pinInput = form.querySelector('[name="pincode"]');

  if (!user) {
    if (emailInput && !emailInput.value.trim()) emailInput.readOnly = false;
    return;
  }

  const profile = await getUserProfile(user.uid) || {};
  const fillIfEmpty = (input, value) => {
    if (input && !input.value.trim() && value) input.value = value;
  };

  fillIfEmpty(nameInput, profile.name || user.displayName);
  fillIfEmpty(emailInput, profile.email || user.email);
  fillIfEmpty(phoneInput, profile.phone);
  fillIfEmpty(addressInput, profile.address);
  fillIfEmpty(areaInput, profile.area);
  fillIfEmpty(cityInput, profile.city);
  fillIfEmpty(stateInput, profile.state);
  fillIfEmpty(pinInput, profile.pin);

  if (emailInput && (profile.email || user.email)) {
    emailInput.readOnly = true;
    emailInput.title = "Signed-in email";
  }
}

function _buildMsg({ name, phone, address, area, city, state, pin, note, items, total }) {
  const lines = [
    "🎨 *New Order — Madhubani Crafts*",
    "─────────────────────",
    `👤 *Name:* ${name}`,
    `📞 *Phone:* ${phone}`,
    `📍 *Address:* ${address}${area ? ", " + area : ""}, ${city}, ${state} — ${pin}`,
    "",
    "*Items:*",
    ...items.map(i => `  • ${i.name}${i.variant ? " (" + i.variant + ")" : ""} × ${i.qty} — ₹${(i.price * i.qty).toLocaleString("en-IN")}`),
    "",
    `💰 *Total: ₹${total.toLocaleString("en-IN")}*`,
    ...(note ? ["", `📝 *Note:* ${note}`] : []),
    "─────────────────────",
    "Please confirm this order. Thank you! 🙏"
  ];
  return lines.join("\n");
}

async function _saveOrder(data) {
  try {
    const { db } = await import('./firebase-config.js');
    if (!db) return;
    const { collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const user = getCurrentUser();
    await addDoc(collection(db, "orders"), {
      ...data,
      userId: user?.uid || null,
      status: "pending",
      createdAt: serverTimestamp()
    });
  } catch (e) { console.warn("Order save:", e.message); }
}

async function _saveCustomerProfile(data) {
  const user = getCurrentUser();
  if (!user) return;

  await saveUserProfile({
    name: data.name,
    email: data.email || user.email || "",
    phone: data.phone,
    address: data.address,
    area: data.area,
    city: data.city,
    state: data.state,
    pin: data.pin
  });
}

async function _renderSummary() {
  const el    = document.getElementById("summary-items");
  const totEl = document.getElementById("summary-total");
  const subEl = document.getElementById("summary-subtotal");
  if (!el) return;

  const items = await Cart.items();
  const total = Cart.total(items);

  if (!items.length) {
    el.innerHTML = `<p style="font-size:13px;color:var(--muted);padding:12px 0">Your cart is empty.</p>`;
    if (totEl) totEl.textContent = "₹0";
    if (subEl) subEl.textContent = "₹0";
    return;
  }

  el.innerHTML = "";
  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "summary-item";
    div.innerHTML = `
      <div class="summary-item-img" style="background:${item.bg}">
        ${item.image ? `<img src="${item.image}" alt="${item.name}"/>` : item.emoji}
      </div>
      <div style="flex:1;min-width:0">
        <div class="summary-item-name">${item.name}</div>
        <div class="summary-item-sub">Qty: ${item.qty}${item.variant ? " · " + item.variant : ""}</div>
      </div>
      <div class="summary-item-price">₹${(item.price * item.qty).toLocaleString("en-IN")}</div>
    `;
    el.appendChild(div);
  });

  const fmt = "₹" + total.toLocaleString("en-IN");
  if (totEl) totEl.textContent = fmt;
  if (subEl) subEl.textContent = fmt;
}

function _validate(form) {
  let ok = true;
  form.querySelectorAll("[required]").forEach(el => {
    el.classList.toggle("error", !el.value.trim());
    if (!el.value.trim()) ok = false;
  });
  const ph = form.querySelector('[name="phone"]');
  if (ph && !/^[6-9]\d{9}$/.test(ph.value.trim())) {
    ph.classList.add("error");
    ok = false;
    alert("Please enter a valid 10-digit mobile number.");
  }
  return ok;
}
