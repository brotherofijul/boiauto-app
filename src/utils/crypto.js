// /src/utils/crypto.js
export function genBotId() {
  return "bot_" + randomHex(7);
}

function genSecureHash() {
  const parts = [];
  const seeds = ["", "salt", "pepper", "sugar", "spice", "herb", "mint", "basil"];
  for (let i = 0; i < 6; i++) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(24));
    const timestamp = Date.now() + i;
    const data = `${Array.from(randomBytes).join("")}${timestamp}${Math.random()}${seeds[i]}`;
    parts.push(Bun.hash(data).toString(16).padStart(16, "0"));
  }
  return parts.join("");
}

export function genToken() {
  return `bot_${genSecureHash()}`;
}

export function genAccessToken() {
  return `acc_${genSecureHash()}`;
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
