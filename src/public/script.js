// /script.js
const API = "/api";

function mapAccount(a, bots) {
  const bot = bots.find((b) => b.bot_id === a.bot_id);
  return {
    id: a.id,
    name: a.name || "",
    bearer: a.bearer || "",
    botId: a.bot_id || "",
    botName: bot?.name || a.bot_id || "",
    botStatus: a.status || (bot?.status || "offline"),
    type: a.type || "Dual",
    balance: a.balance || 0,
    diamond: a.diamond || 0,
    showBearer: false,
    running: !!a.skill_up_running,
    error: "",
    skill: 3,
    pay: 1,
    currentLevel: a.current_level ?? null,
    targetLevel: a.target_level ?? null,
    pendingAt: a.pending_at ?? null,
    time: "\u2014",
    skillUpRunning: !!a.skill_up_running,
    autoWarRunning: !!a.auto_war_running,
    autoWorkRunning: !!a.auto_work_running,
  };
}

function mapBot(b) {
  return {
    id: b.id,
    botId: b.bot_id,
    name: b.name,
    token: b.token,
    type: b.type,
    ratePerDay: b.rate_per_day || 0,
    status: b.status,
    showToken: false,
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
      "left:" + Math.random() * 100 + "%;width:" + sz + "px;height:" + sz +
      "px;animation-duration:" + (14 + Math.random() * 18) + "s;animation-delay:" +
      Math.random() * 14 + "s;";
    if (i % 3 === 0) p.style.background = "#00c8ff";
    c.appendChild(p);
  }
}

function boiauto() {
  return {
    accounts: [],
    bots: [],
    showAddModal: false,
    showAddBotModal: false,
    showEditBotModal: false,
    newBearer: "",
    newSelectedBotId: "",
    showNewBearer: false,
    addError: "",
    addingAccount: false,
    newBotToken: "",
    newBotName: "",
    newBotType: "Dual",
    newBotRate: 0,
    showNewBotToken: false,
    addBotError: "",
    addingBot: false,
    editingBotId: null,
    editBotName: "",
    editBotType: "Dual",
    editBotRate: 0,
    editBotError: "",
    savingBot: false,
    selectedAccountId: null,
    navbarOpen: false,
    currentView: "account",
    switchingView: false,
    pendingView: null,

    init() {
      this.loadBots().then(() => this.loadAccounts());
      spawnParticles();
      this.$watch('selectedAccountId', () => this.updateScrollLock());
      this.$watch('showAddModal', () => this.updateScrollLock());
      this.$watch('showAddBotModal', () => this.updateScrollLock());
      this.$watch('showEditBotModal', () => this.updateScrollLock());
    },

    updateScrollLock() {
      const locked = !!this.selectedAccountId || this.showAddModal || this.showAddBotModal || this.showEditBotModal;
      document.body.style.overflow = locked ? 'hidden' : '';
    },

    openNavbar() { this.navbarOpen = true; },
    closeNavbar() { this.navbarOpen = false; },

    switchView(view) {
      if (this.currentView === view) { this.closeNavbar(); return; }
      if (this.switchingView) return;
      this.switchingView = true;
      this.pendingView = view;
      setTimeout(() => {
        this.currentView = this.pendingView;
        this.switchingView = false;
        this.pendingView = null;
        this.closeNavbar();
      }, 700);
    },

    async loadAccounts() {
      try {
        const res = await fetch(`${API}/accounts`);
        if (!res.ok) throw new Error("Failed to load accounts");
        const data = await res.json();
        this.accounts = data.map((a) => mapAccount(a, this.bots));
      } catch (e) {
        console.error("[loadAccounts]", e);
      }
    },

    async loadBots() {
      try {
        const res = await fetch(`${API}/bots`);
        if (!res.ok) throw new Error("Failed to load bots");
        const data = await res.json();
        this.bots = data.map(mapBot);
      } catch (e) {
        console.error("[loadBots]", e);
      }
    },

    openAddModal() {
      this.newBearer = "";
      this.newSelectedBotId = this.bots.length > 0 ? this.bots[0].id : "";
      this.addError = "";
      this.showNewBearer = false;
      this.addingAccount = false;
      this.showAddModal = true;
    },

    closeAddModal() { this.showAddModal = false; },

    botAccountCount(botId) {
      return this.accounts.filter((a) => a.botId === botId).length;
    },

    isBotFull(bot) {
      if (!bot) return true;
      if (bot.type === "Dual" || bot.type === "Business") {
        return this.botAccountCount(bot.botId) >= 2;
      }
      return false;
    },

    async confirmAddAccount() {
      if (!this.newBearer.trim()) {
        this.addError = "Bearer token is required.";
        return;
      }
      if (!this.newSelectedBotId) {
        this.addError = "Please select a bot.";
        return;
      }
      const selectedBot = this.bots.find((b) => b.id === Number(this.newSelectedBotId));
      if (!selectedBot) {
        this.addError = "Selected bot not found.";
        return;
      }
      if (this.isBotFull(selectedBot)) {
        this.addError = `Bot ${selectedBot.name} has reached its account limit (max 2 for ${selectedBot.type}).`;
        return;
      }
      this.addingAccount = true;
      this.addError = "";
      try {
        const res = await fetch(`${API}/accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bearer: this.newBearer.trim(),
            bot_id: selectedBot.botId,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create account");
        }
        await this.loadAccounts();
        this.closeAddModal();
      } catch (e) {
        this.addError = e.message || "Failed to create account. Please try again.";
      } finally {
        this.addingAccount = false;
      }
    },

    async removeAccount(idx) {
      const a = this.accounts[idx];
      if (!a) return;
      try {
        const res = await fetch(`${API}/accounts/${a.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete account");
        if (this.selectedAccountId === a.id) this.selectedAccountId = null;
        this.accounts.splice(idx, 1);
      } catch (e) {
        console.error("[removeAccount]", e);
      }
    },

    async saveAccount(idx) {
      const a = this.accounts[idx];
      if (!a) return;
      try {
        const res = await fetch(`${API}/accounts/${a.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bearer: a.bearer,
            bot_id: a.botId,
          }),
        });
        if (!res.ok) throw new Error("Failed to update account");
        await this.loadAccounts();
      } catch (e) {
        console.error("[saveAccount]", e);
      }
    },

    async toggleFeature(idx, feature) {
      const a = this.accounts[idx];
      if (!a) return;
      const key = feature + "Running";
      if (!a.bearer.trim() || !a.botId) {
        a.error = "Configure Bearer & Bot first.";
        setTimeout(() => { if (a.error === "Configure Bearer & Bot first.") a.error = ""; }, 3000);
        return;
      }
      const newValue = !a[key];
      try {
        const res = await fetch(`${API}/accounts/${a.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            [feature === "skillUp" ? "skill_up_running" :
              feature === "autoWar" ? "auto_war_running" :
              "auto_work_running"]: newValue ? 1 : 0,
          }),
        });
        if (!res.ok) throw new Error("Failed to toggle feature");
        a[key] = newValue;
        a.running = a.skillUpRunning;
        if (newValue) a.botStatus = "online";
      } catch (e) {
        a.error = "Failed to toggle feature. Please try again.";
        setTimeout(() => { if (a.error === "Failed to toggle feature. Please try again.") a.error = ""; }, 3000);
      }
    },

    openDetail(id) { this.selectedAccountId = id; },
    closeDetail() { this.selectedAccountId = null; },

    get selectedAccount() {
      if (!this.selectedAccountId) return null;
      return this.accounts.find((a) => a.id === this.selectedAccountId) || null;
    },

    get selectedIndex() {
      if (!this.selectedAccountId) return -1;
      return this.accounts.findIndex((a) => a.id === this.selectedAccountId);
    },

    async startAccount(idx) {
      const a = this.accounts[idx];
      if (!a) return;
      if (!a.bearer.trim()) {
        a.error = "Bearer token is required.";
        setTimeout(() => { if (a.error === "Bearer token is required.") a.error = ""; }, 3000);
        return;
      }
      if (!a.botId) {
        a.error = "Bot is required.";
        setTimeout(() => { if (a.error === "Bot is required.") a.error = ""; }, 3000);
        return;
      }
      try {
        const res = await fetch(`${API}/accounts/${a.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skill_up_running: 1 }),
        });
        if (!res.ok) throw new Error("Failed to start account");
        a.running = true;
        a.skillUpRunning = true;
        a.botStatus = "online";
        a.error = "";
      } catch (e) {
        a.error = "Failed to start. Please try again.";
        setTimeout(() => { if (a.error === "Failed to start. Please try again.") a.error = ""; }, 3000);
      }
    },

    async stopAccount(idx) {
      const a = this.accounts[idx];
      if (!a) return;
      try {
        const res = await fetch(`${API}/accounts/${a.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skill_up_running: 0,
            auto_war_running: 0,
            auto_work_running: 0,
          }),
        });
        if (!res.ok) throw new Error("Failed to stop account");
        a.running = false;
        a.skillUpRunning = false;
        a.autoWarRunning = false;
        a.autoWorkRunning = false;
        a.botStatus = "offline";
        a.time = "\u2014";
        a.pendingAt = null;
      } catch (e) {
        a.error = "Failed to stop. Please try again.";
        setTimeout(() => { if (a.error === "Failed to stop. Please try again.") a.error = ""; }, 3000);
      }
    },

    openAddBotModal() {
      this.newBotToken = "";
      this.newBotName = "";
      this.newBotType = "Dual";
      this.newBotRate = 0;
      this.addBotError = "";
      this.showNewBotToken = false;
      this.addingBot = false;
      this.showAddBotModal = true;
    },

    closeAddBotModal() { this.showAddBotModal = false; },

    async confirmAddBot() {
      if (!this.newBotToken.trim()) {
        this.addBotError = "Bot token is required.";
        return;
      }
      if (this.newBotType === "Business" && (!this.newBotRate || this.newBotRate <= 0)) {
        this.addBotError = "Rate per day is required for Business type.";
        return;
      }
      this.addingBot = true;
      this.addBotError = "";
      try {
        const res = await fetch(`${API}/bots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: this.newBotToken.trim(),
            name: this.newBotName.trim() || undefined,
            type: this.newBotType,
            rate_per_day: this.newBotType === "Business" ? Number(this.newBotRate) || 0 : 0,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create bot");
        }
        await this.loadBots();
        this.closeAddBotModal();
      } catch (e) {
        this.addBotError = e.message || "Failed to create bot. Please try again.";
      } finally {
        this.addingBot = false;
      }
    },

    openEditBotModal(idx) {
      const b = this.bots[idx];
      if (!b) return;
      this.editingBotId = b.id;
      this.editBotName = b.name;
      this.editBotType = b.type;
      this.editBotRate = b.ratePerDay || 0;
      this.editBotError = "";
      this.savingBot = false;
      this.showEditBotModal = true;
    },

    closeEditBotModal() {
      this.showEditBotModal = false;
      this.editingBotId = null;
    },

    async saveEditBot() {
      if (!this.editingBotId) return;
      if (this.editBotType === "Business" && (!this.editBotRate || this.editBotRate <= 0)) {
        this.editBotError = "Rate per day is required for Business type.";
        return;
      }
      this.savingBot = true;
      this.editBotError = "";
      try {
        const res = await fetch(`${API}/bots/${this.editingBotId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: this.editBotName.trim(),
            type: this.editBotType,
            rate_per_day: this.editBotType === "Business" ? Number(this.editBotRate) || 0 : 0,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to update bot");
        }
        await this.loadBots();
        await this.loadAccounts();
        this.savingBot = false;
        this.closeEditBotModal();
      } catch (e) {
        this.editBotError = e.message || "Failed to update bot.";
        this.savingBot = false;
      }
    },

    async removeBot(idx) {
      const b = this.bots[idx];
      if (!b) return;
      try {
        const res = await fetch(`${API}/bots/${b.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete bot");
        this.bots.splice(idx, 1);
      } catch (e) {
        console.error("[removeBot]", e);
      }
    },

    maskToken(token) {
      if (!token) return "—";
      if (token.length <= 8) return "•".repeat(token.length);
      return token.slice(0, 4) + "•".repeat(Math.max(4, token.length - 8)) + token.slice(-4);
    },

    typeClass(type) {
      if (type === "Dual") return "text-s1 bg-s1/10 border-s1/30";
      if (type === "Shared") return "text-s2 bg-s2/10 border-s2/30";
      return "text-warn bg-warn/10 border-warn/30";
    },

    timeClass(idx) {
      const a = this.accounts[idx];
      if (!a || !a.pendingAt) return "text-base-500";
      const rem = new Date(a.pendingAt).getTime() - Date.now();
      if (rem <= 0) return "text-base-500";
      if (rem < 10000) return "text-warn";
      return idx % 2 === 0 ? "text-s1" : "text-s2";
    },

    timeLow(idx) {
      const pa = this.accounts[idx]?.pendingAt;
      if (!pa) return false;
      const rem = new Date(pa).getTime() - Date.now();
      return rem > 0 && rem < 10000;
    },

    formatBalance(n) {
      const num = Number(n) || 0;
      return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    formatNumber(n) {
      const num = Number(n) || 0;
      return num.toLocaleString("en-US");
    },

    botStatusText(s) {
      return s === "online" ? "Online" : s === "error" ? "Error" : "Offline";
    },

    botStatusClass(s) {
      return s === "online"
        ? "text-s1 bg-s1/10 border-s1/30"
        : "text-danger bg-danger/10 border-danger/30";
    },

    botStatusDotClass(s) {
      return s === "online" ? "bg-s1" : "bg-danger";
    },

    formatRate(n) {
      const num = Number(n) || 0;
      return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "/day";
    },
  };
}
