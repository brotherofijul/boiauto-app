// /src/utils/crypto.js
export function genBotId() {
  return "bot_" + randomHex(7);
}

export function genToken() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const timestamp = Date.now();
  const data = `${Array.from(randomBytes).join("")}${timestamp}`;
  const hash = Bun.hash(data).toString(16).padStart(16, "0");
  return `bot_${hash}`;
}

export function genAccessId() {
  return "acc_" + randomHex(7);
}

export function randomHex(bytes) {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function maskToken(token) {
  if (!token) return "—";
  if (token.length <= 8) return "•".repeat(token.length);
  return token.slice(0, 4) + "•".repeat(Math.max(4, token.length - 8)) + token.slice(-4);
}
