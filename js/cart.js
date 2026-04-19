// cart.js — localStorage (guest) + Firestore (logged-in), sidebar renderer

const CART_KEY = "mc_cart";

function readLocal() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function writeLocal(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

async function fsGet(uid) {
  try {
    const { db } = await import('./firebase-config.js');
    if (!db) return [];
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(doc(db, "users", uid, "cart", "data"));
    return snap.exists() ? (snap.data().items || []) : [];
  } catch { return []; }
}

async function fsSet(uid, items) {
  try {
    const { db } = await import('./firebase-config.js');
    if (!db) return;
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await setDoc(doc(db, "users", uid, "cart", "data"), { items, ts: Date.now() });
  } catch (e) { console.warn("Cart sync:", e.message); }
}

function merge(local, remote) {
  const map = {};
  [...remote, ...local].forEach(i => {
    const k = i.id + "|" + (i.variant || "");
    map[k] = map[k] ? { ...i, qty: Math.max(map[k].qty, i.qty) } : { ...i };
  });
  return Object.values(map);
}

export const Cart = {
  _uid: null,
  _cbs: [],

  async onAuthChange(uid) {
    this._uid = uid || null;
    if (uid) {
      const local = readLocal();
      const remote = await fsGet(uid);
      const merged = local.length ? merge(local, remote) : remote;
      writeLocal(merged);
      await fsSet(uid, merged);
    }
    this._emit();
  },

  async items() {
    if (this._uid) {
      const remote = await fsGet(this._uid);
      writeLocal(remote);
      return remote;
    }
    return readLocal();
  },

  async add(product, variant = null, qty = 1) {
    const items = readLocal();
    const k = product.id + "|" + (variant || "");
    const ex = items.find(i => i.id + "|" + (i.variant || "") === k);
    if (ex) { ex.qty += qty; }
    else {
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        emoji: product.emoji || "🎨",
        bg: product.bg || "#FDF0E0",
        image: product.images?.[0] || null,
        fabric: product.fabric || "",
        variant,
        qty
      });
    }
    writeLocal(items);
    if (this._uid) await fsSet(this._uid, items);
    this._emit();
    showToast(`${product.name} added to cart`);
  },

  async remove(id, variant) {
    let items = readLocal().filter(i => !(i.id === id && (i.variant || null) === (variant || null)));
    writeLocal(items);
    if (this._uid) await fsSet(this._uid, items);
    this._emit();
  },

  async setQty(id, variant, qty) {
    if (qty < 1) return this.remove(id, variant);
    let items = readLocal().map(i =>
      i.id === id && (i.variant || null) === (variant || null) ? { ...i, qty } : i
    );
    writeLocal(items);
    if (this._uid) await fsSet(this._uid, items);
    this._emit();
  },

  async clear() {
    writeLocal([]);
    if (this._uid) await fsSet(this._uid, []);
    this._emit();
  },

  total(items) { return items.reduce((s, i) => s + i.price * i.qty, 0); },
  count(items) { return items.reduce((s, i) => s + i.qty, 0); },
  onChange(fn) { this._cbs.push(fn); },
  _emit() { this._cbs.forEach(fn => fn()); }
};

// ── Toast ──
export function showToast(msg) {
  let el = document.getElementById("toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2600);
}

// ── Inject cart sidebar HTML into page ──
export function injectCartSidebar() {
  document.body.insertAdjacentHTML("beforeend", `
    <div id="cart-overlay"></div>
    <div id="cart-sidebar">
      <div class="cart-head">
        <h2>Your Cart</h2>
        <button class="cart-close-btn" id="cart-close">✕</button>
      </div>
      <div id="cart-items-list"></div>
      <div class="cart-foot" id="cart-foot" style="display:none">
        <div class="cart-subtotal-row">
          <span>Subtotal</span>
          <strong id="cart-total-val">₹0</strong>
        </div>
        <p class="cart-note">Shipping & payment confirmed via WhatsApp. Orders placed are not charged automatically.</p>
        <a href="checkout.html" class="cart-checkout-link">Proceed to Checkout →</a>
        <button class="cart-continue-btn" id="cart-continue">Continue Shopping</button>
      </div>
    </div>
  `);

  const sidebar  = document.getElementById("cart-sidebar");
  const overlay  = document.getElementById("cart-overlay");
  const itemsEl  = document.getElementById("cart-items-list");
  const footEl   = document.getElementById("cart-foot");
  const totalEl  = document.getElementById("cart-total-val");

  const open  = () => { sidebar.classList.add("open"); overlay.classList.add("open"); document.body.style.overflow = "hidden"; };
  const close = () => { sidebar.classList.remove("open"); overlay.classList.remove("open"); document.body.style.overflow = ""; };

  document.querySelectorAll("[data-open-cart]").forEach(el => el.addEventListener("click", open));
  overlay.addEventListener("click", close);
  document.getElementById("cart-close").addEventListener("click", close);
  document.getElementById("cart-continue").addEventListener("click", close);

  async function render() {
    const items = await Cart.items();
    const count = Cart.count(items);
    const total = Cart.total(items);

    // Update cart button text
    document.querySelectorAll(".cart-btn").forEach(btn => {
      btn.textContent = count > 0 ? `🛒 Cart (${count})` : "🛒 Cart (0)";
    });

    if (items.length === 0) {
      itemsEl.innerHTML = `<div class="cart-empty-msg">Your cart is empty<small>Browse our collection above</small></div>`;
      footEl.style.display = "none";
      return;
    }

    footEl.style.display = "block";
    totalEl.textContent = "₹" + total.toLocaleString("en-IN");

    itemsEl.innerHTML = "";
    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "cart-item";
      div.innerHTML = `
        <div class="cart-item-img" style="background:${item.bg}">
          ${item.image ? `<img src="${item.image}" alt="${item.name}"/>` : item.emoji}
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-sub">${item.variant ? item.variant + " · " : ""}${item.fabric}</div>
          <div class="cart-item-price">₹${(item.price * item.qty).toLocaleString("en-IN")}</div>
          <div class="cart-qty-row">
            <button class="qty-btn" data-dec>−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" data-inc>+</button>
            <button class="cart-item-remove" data-remove>Remove</button>
          </div>
        </div>
      `;
      div.querySelector("[data-dec]").addEventListener("click",    () => Cart.setQty(item.id, item.variant, item.qty - 1));
      div.querySelector("[data-inc]").addEventListener("click",    () => Cart.setQty(item.id, item.variant, item.qty + 1));
      div.querySelector("[data-remove]").addEventListener("click", () => Cart.remove(item.id, item.variant));
      itemsEl.appendChild(div);
    });
  }

  Cart.onChange(render);
  render();

  return { open, close };
}
