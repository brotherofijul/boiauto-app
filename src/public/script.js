// src/public/script.js — UI only, no WebSocket
const LS_TOKENS = "boiauto_tokens";

const ICONS = {
  success:
    '<svg class="w-3 h-3 text-s1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  warn: '<svg class="w-3 h-3 text-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  error:
    '<svg class="w-3 h-3 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  info: '<svg class="w-3 h-3 text-base-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  retry:
    '<svg class="w-3 h-3 text-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
  stopped:
    '<svg class="w-3 h-3 text-base-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
};

function createSlot() {
  return {
    running: false,
    showTk: false,
    error: "",
    token: "",
    skill: "3",
    pay: "1",
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
    mode: "diplomacia",
    slots: { 1: createSlot(), 2: createSlot() },
    logs: [],
    fSlot: "all",
    fType: "all",
    skills: [
      { value: "1", label: "Barrack" },
      { value: "2", label: "War Tech" },
      { value: "3", label: "Scientist" },
    ],

    get filteredLogs() {
      return this.logs.filter((l) => {
        if (this.fSlot !== "all" && l.slot !== Number(this.fSlot)) return false;
        if (this.fType !== "all" && l.logType !== this.fType) return false;
        return true;
      });
    },

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
      // UI-only: simulate start for demo purposes
      s.running = true;
      s.error = "";
      this.addLog(n, "info", "Slot " + n + " started (UI demo mode — no backend).");
    },

    stopSlot(n) {
      const s = this.slots[n];
      s.running = false;
      s.time = "\u2014";
      s.pendingAt = null;
      this.addLog(n, "stopped", "Slot " + n + " stopped.");
    },

    addLog(slot, logType, text) {
      this.logs.push({
        _id: Date.now() + Math.random(),
        time: this.ts(),
        slot,
        logType,
        text,
      });
      if (this.logs.length > 600) this.logs = this.logs.slice(-450);
      this.scrollLog();
    },

    clearLogs() {
      this.logs = [];
    },

    logColor(l) {
      if (l.logType === "success") return l.slot === 1 ? "text-s1" : "text-s2";
      if (l.logType === "warn") return "text-warn";
      if (l.logType === "error") return "text-danger";
      if (l.logType === "stopped") return "text-base-400";
      return "text-base-400";
    },

    logIcon(t) {
      return ICONS[t] || ICONS.info;
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

    fmtCd(ms) {
      if (ms <= 0) return "00:00";
      const t = Math.floor(ms / 1000);
      const h = Math.floor(t / 3600);
      const m = Math.floor((t % 3600) / 60);
      const sec = t % 60;
      const ss = String(sec).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      return h > 0 ? h + ":" + mm + ":" + ss : mm + ":" + ss;
    },

    ts() {
      return new Date().toTimeString().slice(0, 8);
    },

    scrollLog() {
      this.$nextTick(() => {
        this.$refs.logBox &&
          (this.$refs.logBox.scrollTop = this.$refs.logBox.scrollHeight);
      });
    },
  };
}
