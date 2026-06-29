// src/public/script.js — UI only, no WebSocket, no Console
const LS_TOKENS = "boiauto_tokens";

function createSlot() {
  return {
    running: false,
    showTk: false,
    error: "",
    token: "",
    skill: 3,
    pay: 1,
    currentLevel: null,
    targetLevel: null,
    pendingAt: null,
    time: "\u2014",
    _timer: null,
  };
}

function spawnParticles() {
  const c = document.getElementById("particles");
  if (!c) return;
  for (let i = 0; i < 14; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const sz = 2 + Math.random() * 2;
    p.style.cssText =
      "left:" +
      Math.random() * 100 +
      "%;width:" +
      sz +
      "px;height:" +
      sz +
      "px;animation-duration:" +
      (14 + Math.random() * 18) +
      "s;animation-delay:" +
      Math.random() * 14 +
      "s;";
    if (i % 3 === 0) p.style.background = "#00c8ff";
    c.appendChild(p);
  }
}

function boiauto() {
  return {
    slots: { 1: createSlot(), 2: createSlot() },

    init() {
      this.loadTokens();
      spawnParticles();
    },

    loadTokens() {
      try {
        const d = JSON.parse(localStorage.getItem(LS_TOKENS)) || {};
        if (d[1]) this.slots[1].token = d[1];
        if (d[2]) this.slots[2].token = d[2];
      } catch {}
    },

    saveToken(n) {
      try {
        const d = JSON.parse(localStorage.getItem(LS_TOKENS)) || {};
        d[n] = this.slots[n].token;
        localStorage.setItem(LS_TOKENS, JSON.stringify(d));
      } catch {}
    },

    startSlot(n) {
      const s = this.slots[n];
      if (!s.token.trim()) {
        s.error = "Token is required.";
        setTimeout(() => { if (s.error === "Token is required.") s.error = ""; }, 3000);
        return;
      }
      s.running = true;
      s.error = "";
    },

    stopSlot(n) {
      const s = this.slots[n];
      s.running = false;
      s.time = "\u2014";
      s.pendingAt = null;
    },

    timeClass(n) {
      const s = this.slots[n];
      if (!s.pendingAt) return "text-base-500";
      const rem = new Date(s.pendingAt).getTime() - Date.now();
      if (rem <= 0) return "text-base-500";
      if (rem < 10000) return "text-warn";
      return n === 1 ? "text-s1" : "text-s2";
    },

    timeLow(n) {
      const pa = this.slots[n].pendingAt;
      if (!pa) return false;
      const rem = new Date(pa).getTime() - Date.now();
      return rem > 0 && rem < 10000;
    },
  };
}