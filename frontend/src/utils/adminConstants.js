// Transformasi data backend → bentuk yang dipakai panel admin

import { toNumber } from "./format";

/** Ambil angka pertama dari teks harga ("Rp 5.000.000" → 5000000) */
export const firstAmount = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const m = String(v).replace(/[.,]/g, "").match(/\d{3,}/);
  return m ? parseInt(m[0], 10) : toNumber(v);
};

export const transformProject = (item) => {
  const planPriceRange = item.plan_price_range || item.PlanPriceRange || null;
  return {
    id: item.id ?? item.ID,
    userId: item.user_id ?? item.UserID,
    projectTitle: item.project_title || item.ProjectTitle || "–",
    category: item.category || "–",
    description: item.description || "–",
    skills: item.skills || "",
    contactName: item.contact_name || item.ContactName || "–",
    contactPhone: item.contact_phone || item.ContactPhone || "–",
    additionalNotes: item.additional_notes || "",
    planTitle: item.plan_title || item.PlanTitle || "",
    priceRange: item.price_range || item.PriceRange || "",     // estimasi dari paket
    planPriceRange,                                             // harga final dari admin (teks)
    price: planPriceRange ? firstAmount(planPriceRange) : 0,    // harga final (angka)
    status: item.status || "pending",
    rejectReason: item.reject_reason || "",
    createdAt: item.created_at || item.CreatedAt,
  };
};

export const transformUser = (item) => {
  const firstName = item.first_name || item.FirstName || "";
  const lastName = item.last_name || item.LastName || "";
  return {
    id: item.id ?? item.ID,
    name: [firstName, lastName].filter(Boolean).join(" ") || item.username || "–",
    username: item.username || "–",
    email: item.email || item.Email || "–",
    phone: item.phone || item.Phone || "–",
    role: item.role || item.Role || "user",
    isAktif: item.is_aktif,
    createdAt: item.created_at || item.CreatedAt,
  };
};

export const transformTrx = (t) => ({
  id: t.id,
  orderId: t.order_id || "–",
  projectId: t.project_id,
  userId: t.user_id,
  amount: Number(t.amount || 0),
  status: t.status || "pending",
  createdAt: t.created_at,
});

/** Paket: "open" = tanpa batas atas (ditandai price_range diawali "Mulai") */
export const transformPlan = (p) => {
  const sortFeat = (arr) => (Array.isArray(arr) ? [...arr].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((f) => (typeof f === "string" ? f : f.feature)).filter(Boolean) : []);
  return {
    id: p.id,
    title: p.title || "",
    tier: p.tier || "starter",
    min: Number(p.min_price || 0),
    max: p.max_price == null ? null : Number(p.max_price),
    open: p.max_price == null || /^mulai/i.test(String(p.price_range || "").trim()),
    priceRange: p.price_range || "",
    desc: p.description || "",
    sort: Number(p.sort_order || 0),
    active: p.is_active !== false,
    inc: sortFeat(p.features),
    out: sortFeat(p.not_included),
    timeline: p.timeline || "",
    badge: p.badge || "",
    upgradeNote: p.upgrade_note || "",
  };
};
