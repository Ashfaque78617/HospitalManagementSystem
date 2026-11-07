// The API stores timestamps in UTC but serialises them without a "Z" suffix.
export function parseUtc(value) {
  if (!value) return null;
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
}

// "2026-10-19" -> local Date without timezone shifting.
function parseDateOnly(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDate(value) {
  if (!value) return "—";
  const d = value.length === 10 ? parseDateOnly(value) : parseUtc(value);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(value) {
  if (!value) return "—";
  return parseUtc(value).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function fmtTime(value) {
  if (!value) return "—";
  const [h, m] = value.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export const toTimeParam = (t) => (t && t.length === 5 ? `${t}:00` : t);
export const toInputTime = (t) => (t ? t.slice(0, 5) : "");

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const addDaysIso = (iso, days) => {
  const d = parseDateOnly(iso);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const initials = (name = "") =>
  name.replace(/^Dr\.?\s+/i, "").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

export const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Drops empty values so they are not sent as query params.
export const cleanParams = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== null && v !== undefined));

// Empty strings -> null, so optional fields validate correctly on the server.
export const nullify = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v]));
