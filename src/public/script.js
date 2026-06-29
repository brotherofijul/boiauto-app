// src/public/script.js — UI only, no WebSocket, no Console
const LS_ACCOUNTS = "boiauto_accounts";

function createAccount() {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    bearer: "",
    botToken: "",
    showBearer: false,
    showBot: false,
    running: false,
    error: "",
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
    accounts: [],
    showAddModal: false,
    newBearer: "",
    newBotToken: "",
    showNewBearer: false,
    showNewBot: false,
    addError: "",

    init() {
      this.loadAccounts();
      spawnParticles();
      // Auto-open Add Account modal on first visit (no accounts yet)
      if (this.accounts.length === 0) {
        this.$nextTick(() => this.openAddModal());
      }
    },

    loadAccounts() {
      try {
        const arr = JSON.parse(localStorage.getItem(LS_ACCOUNTS)) || [];
        this.accounts = arr.map((a) => ({ ...createAccount(), ...a }));
      } catch {}
    },

    saveAccounts() {
      try {
        const data = this.accounts.map((a) => {
          const { _timer, ...rest } = a;
          return rest;
        });
        localStorage.setItem(LS_ACCOUNTS, JSON.stringify(data));
      } catch {}
    },

    openAddModal() {
      this.newBearer = "";
      this.newBotToken = "";
      this.addError = "";
      this.showNewBearer = false;
      this.showNewBot = false;
      this.showAddModal = true;
    },

    closeAddModal() {
      this.showAddModal = false;
    },

    confirmAddAccount() {
      if (!this.newBearer.trim()) {
        this.addError = "Bearer token is required.";
        return;
      }
      if (!this.newBotToken.trim()) {
        this.addError = "Bot token is required.";
        return;
      }
      const acc = createAccount();
      acc.bearer = this.newBearer.trim();
      acc.botToken = this.newBotToken.trim();
      this.accounts.push(acc);
      this.saveAccounts();
      this.closeAddModal();
    },

    removeAccount(idx) {
      const a = this.accounts[idx];
      if (a && a.running) a.running = false;
      this.accounts.splice(idx, 1);
      this.saveAccounts();
    },

    saveAccount(idx) {
      this.saveAccounts();
    },

    startAccount(idx) {
      const a = this.accounts[idx];
      if (!a.bearer.trim()) {
        a.error = "Bearer token is required.";
        setTimeout(() => {
          if (a.error === "Bearer token is required.") a.error = "";
        }, 3000);
        return;
      }
      if (!a.botToken.trim()) {
        a.error = "Bot token is required.";
        setTimeout(() => {
          if (a.error === "Bot token is required.") a.error = "";
        }, 3000);
        return;
      }
      a.running = true;
      a.error = "";
    },

    stopAccount(idx) {
      const a = this.accounts[idx];
      a.running = false;
      a.time = "\u2014";
      a.pendingAt = null;
    },

    timeClass(idx) {
      const a = this.accounts[idx];
      if (!a.pendingAt) return "text-base-500";
      const rem = new Date(a.pendingAt).getTime() - Date.now();
      if (rem <= 0) return "text-base-500";
      if (rem < 10000) return "text-warn";
      return idx % 2 === 0 ? "text-s1" : "text-s2";
    },

    timeLow(idx) {
      const pa = this.accounts[idx].pendingAt;
      if (!pa) return false;
      const rem = new Date(pa).getTime() - Date.now();
      return rem > 0 && rem < 10000;
    },

    accentClass(idx) {
      return idx % 2 === 0 ? "s1" : "s2";
    },
  };
}
