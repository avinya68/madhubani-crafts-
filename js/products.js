// products.js — product catalog + Firestore fetch with local fallback

export const LOCAL_PRODUCTS = [
  {
    id: "p001",
    name: "Peacock Tussar Silk Saree",
    category: "sarees",
    fabric: "Tussar Silk · Handpainted",
    price: 6200,
    originalPrice: null,
    emoji: "🥻",
    bg: "#FDF0E0",
    badge: "Bestseller",
    description: "A stunning hand-painted tussar silk saree featuring the iconic Madhubani peacock motif. Each bird is painted with natural pigments using traditional Mithila techniques. The silk drapes beautifully and the colours are fast-set.",
    images: [],
    variants: ["Rust & Ochre", "Indigo & Gold", "Green & Crimson"],
    tags: ["peacock", "saree", "silk", "bestseller"]
  },
  {
    id: "p002",
    name: "Floral Chanderi Saree",
    category: "sarees",
    fabric: "Chanderi · Handpainted",
    price: 5400,
    originalPrice: null,
    emoji: "🌸",
    bg: "#F0EAF5",
    badge: "New",
    description: "Lightweight chanderi fabric adorned with intricate Madhubani floral motifs — lotuses, vines and birds woven into an unforgettable composition. Perfect for festive and formal occasions.",
    images: [],
    variants: ["Peach & Gold", "Mint & Silver", "Lilac & Red"],
    tags: ["floral", "saree", "chanderi", "new"]
  },
  {
    id: "p003",
    name: "Radha Krishna Canvas",
    category: "paintings",
    fabric: "Original Painting · 12×16 inch",
    price: 2499,
    originalPrice: null,
    emoji: "🖼️",
    bg: "#E8F4EA",
    badge: null,
    description: "Original Madhubani painting of Radha and Krishna on handmade paper. Painted with natural earth pigments using fine bamboo brushes. Framing-ready with a 1-inch border. Certificate of authenticity included.",
    images: [],
    variants: ["12×16 inch", "16×20 inch"],
    tags: ["radha krishna", "painting", "canvas", "religious"]
  },
  {
    id: "p004",
    name: "Painted Terracotta Pot",
    category: "home-decor",
    fabric: "Home Decor · Handpainted",
    price: 799,
    originalPrice: null,
    emoji: "🪴",
    bg: "#FDF3E0",
    badge: "New",
    description: "Traditional terracotta pot hand-painted with Madhubani fish and lotus motifs. Sealed inside for plants. Each pot is unique — slight variations in pattern are a mark of handcraft, not a defect.",
    images: [],
    variants: ["Small (4 inch)", "Medium (6 inch)", "Large (8 inch)"],
    tags: ["terracotta", "pot", "home decor", "new"]
  },
  {
    id: "p005",
    name: "Madhubani Tote Bag",
    category: "accessories",
    fabric: "Accessory · Cotton Canvas",
    price: 649,
    originalPrice: null,
    emoji: "👜",
    bg: "#F5E8E0",
    badge: null,
    description: "Sturdy cotton canvas tote hand-painted with Madhubani peacock and floral motifs. Reinforced handles, inner pocket. Fits A4 size comfortably. Colours are water-resistant after heat-setting.",
    images: [],
    variants: ["Natural Canvas", "Black Canvas"],
    tags: ["tote", "bag", "accessories", "peacock"]
  },
  {
    id: "p006",
    name: "Mithila Silk Kurta Set",
    category: "kurta-sets",
    fabric: "Silk · Unstitched",
    price: 3800,
    originalPrice: null,
    emoji: "👘",
    bg: "#EDF0F5",
    badge: "Bestseller",
    description: "Unstitched silk kurta fabric with Madhubani border work. Comes with a coordinating dupatta. Stitching can be arranged on request. Perfect for weddings, pujas, and cultural events.",
    images: [],
    variants: ["S", "M", "L", "XL", "XXL"],
    tags: ["kurta", "silk", "set", "bestseller"]
  },
  {
    id: "p007",
    name: "Madhubani Cushion Cover",
    category: "home-decor",
    fabric: "Home Decor · Set of 2",
    price: 1199,
    originalPrice: 1499,
    emoji: "🛋️",
    bg: "#F0F5E8",
    badge: null,
    description: "Set of 2 hand-painted cushion covers with Madhubani peacock motifs. Cotton fabric, zip closure. Fits 16×16 inch inserts (not included). Machine wash cold, gentle cycle.",
    images: [],
    variants: ["16×16 inch", "18×18 inch"],
    tags: ["cushion", "home decor", "set"]
  },
  {
    id: "p008",
    name: "Handpainted Diary",
    category: "accessories",
    fabric: "Accessory · A5 size",
    price: 499,
    originalPrice: null,
    emoji: "📓",
    bg: "#FDF0E8",
    badge: null,
    description: "Hardbound A5 diary with a Madhubani hand-painted cover. 200 pages of cream ruled paper. A perfect gift for art lovers. Each cover is one-of-a-kind.",
    images: [],
    variants: ["Peacock Design", "Fish Motif", "Floral"],
    tags: ["diary", "gift", "accessories"]
  }
];

export const CATEGORIES = [
  { id: "all",         label: "All" },
  { id: "sarees",      label: "Sarees" },
  { id: "kurta-sets",  label: "Kurta Sets" },
  { id: "paintings",   label: "Paintings" },
  { id: "home-decor",  label: "Home Decor" },
  { id: "accessories", label: "Accessories" },
];

export async function getProducts() {
  try {
    const { db } = await import('./firebase-config.js');
    if (!db) return LOCAL_PRODUCTS;
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDocs(collection(db, "products"));
    if (snap.empty) return LOCAL_PRODUCTS;
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return LOCAL_PRODUCTS;
  }
}

export async function getProductById(id) {
  const all = await getProducts();
  return all.find(p => p.id === id) || null;
}

export function formatPrice(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

// Render a product card matching the original site's exact card markup
export function renderProductCard(product, onAddToCart) {
  const card = document.createElement("div");
  card.className = "prod-card";
  const hasSale = product.originalPrice && product.originalPrice > product.price;

  card.innerHTML = `
    <div class="prod-img" style="background:${product.bg || '#FDF0E0'}; cursor:pointer;">
      ${product.images?.length ? `<img src="${product.images[0]}" alt="${product.name}" loading="lazy"/>` : product.emoji || "🎨"}
      ${product.badge ? `<div class="prod-badge">${product.badge}</div>` : ""}
      <button class="prod-wish" title="Wishlist">♡</button>
    </div>
    <div class="prod-body">
      <div class="prod-name">${product.name}</div>
      <div class="prod-fabric">${product.fabric || product.category}</div>
      <div class="prod-row">
        <span class="prod-price">${formatPrice(product.price)}${hasSale ? ` <small style="text-decoration:line-through;color:var(--muted);font-size:11px">${formatPrice(product.originalPrice)}</small>` : ""}</span>
        <button class="add-btn">Add to cart</button>
      </div>
    </div>
  `;

  // Wishlist toggle
  card.querySelector(".prod-wish").addEventListener("click", e => {
    e.stopPropagation();
    const w = e.currentTarget;
    w.textContent = w.textContent === "♡" ? "❤️" : "♡";
  });

  // Add to cart
  card.querySelector(".add-btn").addEventListener("click", e => {
    e.stopPropagation();
    onAddToCart(product);
  });

  // Click card → product page
  card.addEventListener("click", () => {
    window.location.href = `product.html?id=${product.id}`;
  });

  return card;
}
