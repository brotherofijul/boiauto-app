// /src/utils/validate.js
const NAME_MAX = 64;
const TOKEN_MAX = 256;
const BEARER_MAX = 4096;
const PRICE_MIN = 0;
const PRICE_MAX = 1_000_000;

export function sanitizeName(value) {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  return value.trim().slice(0, NAME_MAX);
}

export function sanitizeToken(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > TOKEN_MAX) return null;
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(trimmed)) return null;
  return trimmed;
}

export function sanitizeBearer(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > BEARER_MAX) return null;
  if (/[<>"'`]/.test(trimmed)) return null;
  return trimmed;
}

export function sanitizeAccessId(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 64) return null;
  if (!/^acc_[a-zA-Z0-9_]+$/.test(trimmed)) return null;
  return trimmed;
}

export function sanitizeBotId(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 64) return null;
  if (!/^bot_[a-zA-Z0-9_]+$/.test(trimmed)) return null;
  return trimmed;
}

export function isValidPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return false;
  if (n <= PRICE_MIN) return false;
  if (n > PRICE_MAX) return false;
  return true;
}

export function clampInt(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  const i = Math.trunc(n);
  return Math.max(min, Math.min(max, i));
}

export const LIMITS = { NAME_MAX, TOKEN_MAX, BEARER_MAX, PRICE_MIN, PRICE_MAX };
