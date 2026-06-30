// /script.js
const API = "/api";

function mapAccount(a) {
  return {
    id: a.id,
    name: a.name || "",
    bearer: a.bearer || "",
    botId: a.bot_id || "",
    botName: a.bot_name || "",
    botStatus: a.bot_status_raw || "disconnected",
    accessId: a.access_id || "",
    accessName: a.access_name || "",
    accessType: a.access_type || "Private",
    accessPrice: a.access_price || 0,
    type: a.type || "Private",
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
    status: b.status,
    showToken: false,
  };
}

function mapAccess(a) {
  return {
    id: a.id,
    accessId: a.access_id,
    token: a.token,
    botId: a.bot_id,
    botName: a.bot_name || "",
    botType: a.bot_type || "",
    name: a.name || "",
    type: a.type || "Private",
    pricePerDay: a.price_per_day || 0,
    usageCount: a.usage_count || 0,
    showToken: false,
    createdAt: a.created_at,
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
    accessList: [],
    dashboard: null,
    loadingBots: true,
    loadingAccess: true,
    loadingAccounts: true,
    loadingDashboard: true,
    searchBots: "",
    searchAccess: "",
    searchAutomates: "",
    toasts: [],
    confirmModal: { open: false, title: "", message: "", resolve: null },
    showAddModal: false,
    showAddBotModal: false,
    showEditBotModal: false,
    showAddAccessModal: false,

    newBearer: "",
    newSelectedAccessId: "",
    showNewBearer: false,
    addError: "",
    addingAccount: false,

    newBotName: "",
    newBotType: "Dual",
    generatedBotToken: "",
    generatingToken: false,
    tokenCopied: false,
    addBotError: "",
    addingBot: false,
    botConnectedWhileOpen: false,
    newlyAddedBotId: null,

    editingBotId: null,
    editBotName: "",
    editBotToken: "",
    editBotType: "Dual",
    editBotError: "",
    savingBot: false,

    newAccessBotId: "",
    newAccessName: "",
    newAccessType: "Private",
    newAccessPrice: 0,
    generatedAccessToken: "",
    accessCopied: false,
    addAccessError: "",
    addingAccess: false,

    selectedAccountId: null,
    navbarOpen: false,
    currentView: "dashboard",

    init() {
      this.loadBots();
      this.loadAccounts();
      this.loadAccess();
      this.loadDashboard();
      spawnParticles();
      this.$watch('selectedAccountId', () => this.updateScrollLock());
      this.$watch('showAddModal', () => this.updateScrollLock());
      this.$watch('showAddBotModal', () => this.updateScrollLock());
      this.$watch('showEditBotModal', () => this.updateScrollLock());
      this.$watch('showAddAccessModal', () => this.updateScrollLock());

      this.$watch('bots', (bots) => {
        if (this.newlyAddedBotId && this.showAddBotModal) {
          const bot = bots.find((b) => b.botId === this.newlyAddedBotId);
          if (bot && bot.status === 'connected') {
            this.botConnectedWhileOpen = true;
          }
        }
      });
    },

    updateScrollLock() {
      const locked = !!this.selectedAccountId || this.showAddModal || this.showAddBotModal || this.showEditBotModal || this.showAddAccessModal;
      document.body.style.overflow = locked ? 'hidden' : '';
    },

    openNavbar() { this.navbarOpen = true; },
    closeNavbar() { this.navbarOpen = false; },

    switchView(view) {
      if (this.currentView === view) {
        this.closeNavbar();
        return;
      }
      this.currentView = view;
      this.closeNavbar();
      if (view === 'dashboard') this.loadDashboard();
      if (view === 'automate') this.loadAccounts();
      if (view === 'bot') this.loadBots();
      if (view === 'access') this.loadAccess();
    },

    async loadDashboard() {
      this.loadingDashboard = true;
      try {
        const res = await fetch(`${API}/dashboard`);
        if (!res.ok) throw new Error("Failed to load dashboard");
        this.dashboard = await res.json();
      } catch (e) {
        console.error("[loadDashboard]", e);
        this.showToast("error", "Failed to load dashboard");
      } finally {
        this.loadingDashboard = false;
      }
    },

    async loadAccounts() {
      this.loadingAccounts = true;
      try {
        const res = await fetch(`${API}/accounts`);
        if (!res.ok) throw new Error("Failed to load accounts");
        const data = await res.json();
        this.accounts = data.map(mapAccount);
      } catch (e) {
        console.error("[loadAccounts]", e);
        this.showToast("error", "Failed to load automates");
      } finally {
        this.loadingAccounts = false;
      }
    },

    async loadBots() {
      this.loadingBots = true;
      try {
        const res = await fetch(`${API}/bots`);
        if (!res.ok) throw new Error("Failed to load bots");
        const data = await res.json();
        this.bots = data.map(mapBot);
      } catch (e) {
        console.error("[loadBots]", e);
        this.showToast("error", "Failed to load bots");
      } finally {
        this.loadingBots = false;
      }
    },

    async loadAccess() {
      this.loadingAccess = true;
      try {
        const res = await fetch(`${API}/access`);
        if (!res.ok) throw new Error("Failed to load access tokens");
        const data = await res.json();
        this.accessList = data.map(mapAccess);
      } catch (e) {
        console.error("[loadAccess]", e);
        this.showToast("error", "Failed to load access tokens");
      } finally {
        this.loadingAccess = false;
      }
    },

    get filteredBots() {
      if (!this.searchBots.trim()) return this.bots;
      const q = this.searchBots.toLowerCase();
      return this.bots.filter((b) =>
        b.name.toLowerCase().includes(q) ||
        b.botId.toLowerCase().includes(q) ||
        b.type.toLowerCase().includes(q)
      );
    },

    get filteredAccess() {
      if (!this.searchAccess.trim()) return this.accessList;
      const q = this.searchAccess.toLowerCase();
      return this.accessList.filter((a) =>
        (a.name || "").toLowerCase().includes(q) ||
        a.accessId.toLowerCase().includes(q) ||
        a.botName.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q)
      );
    },

    get filteredAutomates() {
      if (!this.searchAutomates.trim()) return this.accounts;
      const q = this.searchAutomates.toLowerCase();
      return this.accounts.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        (a.botName || "").toLowerCase().includes(q) ||
        (a.accessName || "").toLowerCase().includes(q)
      );
    },

    showToast(type, message, duration = 4000) {
      const id = Date.now() + Math.random();
      this.toasts.push({ id, type, message });
      setTimeout(() => {
        this.toasts = this.toasts.filter((t) => t.id !== id);
      }, duration);
    },

    dismissToast(id) {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    },

    confirmAction(title, message) {
      return new Promise((resolve) => {
        this.confirmModal = { open: true, title, message, resolve };
      });
    },

    confirmYes() {
      this.confirmModal.resolve?.(true);
      this.confirmModal = { open: false, title: "", message: "", resolve: null };
    },

    confirmNo() {
      this.confirmModal.resolve?.(false);
      this.confirmModal = { open: false, title: "", message: "", resolve: null };
    },

    openAddModal() {
      this.newBearer = "";
      this.newSelectedAccessId = this.accessList.length > 0 ? this.accessList[0].accessId : "";
      this.addError = "";
      this.showNewBearer = false;
      this.addingAccount = false;
      this.showAddModal = true;
    },

    closeAddModal() { this.showAddModal = false; },

    accessUsageText(a) {
      if (!a) return "";
      if (a.type === "Shared") return `${a.usageCount}`;
      return `${a.usageCount}/1`;
    },

    isAccessFull(a) {
      if (!a) return true;
      if (a.type === "Shared") return false;
      return a.usageCount >= 1;
    },

    async confirmAddAccount() {
      if (!this.newBearer.trim()) {
        this.addError = "Bearer token is required.";
        return;
      }
      if (!this.newSelectedAccessId) {
        this.addError = "Please select an access.";
        return;
      }
      const selectedAccess = this.accessList.find((a) => a.accessId === this.newSelectedAccessId);
      if (!selectedAccess) {
        this.addError = "Selected access not found.";
        return;
      }
      if (this.isAccessFull(selectedAccess)) {
        this.addError = `Access ${selectedAccess.name || selectedAccess.accessId} has reached its limit (max 1 automate for ${selectedAccess.type}).`;
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
            access_id: selectedAccess.accessId,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create automate");
        }
        await this.loadAccounts();
        this.closeAddModal();
        this.showToast("success", "Automate created");
      } catch (e) {
        this.addError = e.message || "Failed to create automate. Please try again.";
      } finally {
        this.addingAccount = false;
      }
    },

    async removeAccount(idx) {
      const a = this.accounts[idx];
      if (!a) return;
      const ok = await this.confirmAction(
        "Delete Automate?",
        `This will permanently delete "${a.name}". This cannot be undone.`
      );
      if (!ok) return;
      try {
        const res = await fetch(`${API}/accounts/${a.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete automate");
        if (this.selectedAccountId === a.id) this.selectedAccountId = null;
        this.accounts.splice(idx, 1);
        this.loadAccess();
        this.showToast("success", "Automate deleted");
      } catch (e) {
        console.error("[removeAccount]", e);
        this.showToast("error", "Failed to delete automate");
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
            access_id: a.accessId,
          }),
        });
        if (!res.ok) throw new Error("Failed to update automate");
        await this.loadAccounts();
      } catch (e) {
        console.error("[saveAccount]", e);
      }
    },

    async toggleFeature(idx, feature) {
      const a = this.accounts[idx];
      if (!a) return;
      const key = feature + "Running";
      if (!a.bearer.trim() || !a.accessId) {
        a.error = "Configure Bearer & Access first.";
        setTimeout(() => { if (a.error === "Configure Bearer & Access first.") a.error = ""; }, 3000);
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
        if (newValue) a.botStatus = "connected";
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
      if (!a.accessId) {
        a.error = "Access is required.";
        setTimeout(() => { if (a.error === "Access is required.") a.error = ""; }, 3000);
        return;
      }
      try {
        const res = await fetch(`${API}/accounts/${a.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skill_up_running: 1 }),
        });
        if (!res.ok) throw new Error("Failed to start automate");
        a.running = true;
        a.skillUpRunning = true;
        a.botStatus = "connected";
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
        if (!res.ok) throw new Error("Failed to stop automate");
        a.running = false;
        a.skillUpRunning = false;
        a.autoWarRunning = false;
        a.autoWorkRunning = false;
        a.botStatus = "disconnected";
        a.time = "\u2014";
        a.pendingAt = null;
      } catch (e) {
        a.error = "Failed to stop. Please try again.";
        setTimeout(() => { if (a.error === "Failed to stop. Please try again.") a.error = ""; }, 3000);
      }
    },

    openAddBotModal() {
      this.newBotName = "";
      this.newBotType = "Dual";
      this.generatedBotToken = "";
      this.generatingToken = false;
      this.tokenCopied = false;
      this.addBotError = "";
      this.addingBot = false;
      this.botConnectedWhileOpen = false;
      this.newlyAddedBotId = null;
      this.showAddBotModal = true;
    },

    closeAddBotModal() {
      this.showAddBotModal = false;
      this.newlyAddedBotId = null;
      this.generatedBotToken = "";
      this.botConnectedWhileOpen = false;
    },

    async generateBotToken() {
      this.generatingToken = true;
      this.addBotError = "";
      try {
        const res = await fetch(`${API}/bots/generate-token`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to generate token");
        const data = await res.json();
        this.generatedBotToken = data.token;
        this.tokenCopied = false;
      } catch (e) {
        this.addBotError = "Failed to generate token. Please try again.";
      } finally {
        this.generatingToken = false;
      }
    },

    async copyBotToken() {
      if (!this.generatedBotToken) return;
      try {
        await navigator.clipboard.writeText(this.generatedBotToken);
        this.tokenCopied = true;
        setTimeout(() => { this.tokenCopied = false; }, 2000);
      } catch (e) {
        this.addBotError = "Failed to copy token.";
      }
    },

    async copyToClipboard(text, toastMsg = "Copied to clipboard") {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        this.showToast("success", toastMsg);
      } catch (e) {
        this.showToast("error", "Failed to copy");
      }
    },

    get addBotButtonLabel() {
      if (this.botConnectedWhileOpen) return "Finished";
      if (this.newlyAddedBotId) return "Waiting Later";
      return "Add Bot";
    },

    async confirmAddBot() {
      if (this.botConnectedWhileOpen) {
        this.closeAddBotModal();
        return;
      }
      if (this.newlyAddedBotId) {
        this.closeAddBotModal();
        return;
      }
      if (!this.generatedBotToken) {
        this.addBotError = "Generate a token first.";
        return;
      }
      this.addingBot = true;
      this.addBotError = "";
      try {
        const res = await fetch(`${API}/bots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: this.generatedBotToken,
            name: this.newBotName.trim() || undefined,
            type: this.newBotType,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create bot");
        }
        const bot = await res.json();
        this.newlyAddedBotId = bot.bot_id;
        await this.loadBots();
        this.showToast("success", "Bot created. Waiting for client to connect.");
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
      this.editBotToken = b.token;
      this.editBotType = b.type;
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
      if (!this.editBotName.trim()) {
        this.editBotError = "Name is required.";
        return;
      }
      if (!this.editBotToken.trim()) {
        this.editBotError = "Token is required.";
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
            token: this.editBotToken.trim(),
            type: this.editBotType,
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
        this.showToast("success", "Bot updated");
      } catch (e) {
        this.editBotError = e.message || "Failed to update bot.";
        this.savingBot = false;
      }
    },

    async removeBot(idx) {
      const b = this.bots[idx];
      if (!b) return;
      const ok = await this.confirmAction(
        "Delete Bot?",
        `This will permanently delete "${b.name}" and all access tokens linked to it. This cannot be undone.`
      );
      if (!ok) return;
      try {
        const res = await fetch(`${API}/bots/${b.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete bot");
        this.bots.splice(idx, 1);
        await this.loadAccess();
        this.showToast("success", "Bot deleted");
      } catch (e) {
        console.error("[removeBot]", e);
        this.showToast("error", "Failed to delete bot");
      }
    },

    openAddAccessModal() {
      this.newAccessBotId = this.bots.length > 0 ? this.bots[0].id : "";
      this.newAccessName = "";
      this.newAccessType = "Private";
      this.newAccessPrice = 0;
      this.addAccessError = "";
      this.addingAccess = false;
      this.showAddAccessModal = true;
    },

    closeAddAccessModal() {
      this.showAddAccessModal = false;
    },

    async confirmAddAccess() {
      if (!this.newAccessBotId) {
        this.addAccessError = "Please select a bot.";
        return;
      }
      if (this.newAccessType === "Business" && (!this.newAccessPrice || this.newAccessPrice <= 0)) {
        this.addAccessError = "Business type requires price per day.";
        return;
      }
      this.addingAccess = true;
      this.addAccessError = "";
      try {
        const selectedBot = this.bots.find((b) => b.id === Number(this.newAccessBotId));
        if (!selectedBot) throw new Error("Bot not found");

        const res = await fetch(`${API}/access`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bot_id: selectedBot.botId,
            name: this.newAccessName.trim() || undefined,
            type: this.newAccessType,
            price_per_day: this.newAccessType === "Business" ? Number(this.newAccessPrice) || 0 : 0,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create access token");
        }
        await this.loadAccess();
        this.closeAddAccessModal();
        this.showToast("success", "Access token created");
      } catch (e) {
        this.addAccessError = e.message || "Failed to create access token.";
      } finally {
        this.addingAccess = false;
      }
    },

    async removeAccess(idx) {
      const a = this.accessList[idx];
      if (!a) return;
      const ok = await this.confirmAction(
        "Revoke Access?",
        `This will permanently revoke access token "${a.name || a.accessId}". The recipient will no longer be able to use it.`
      );
      if (!ok) return;
      try {
        const res = await fetch(`${API}/access/${a.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete access token");
        this.accessList.splice(idx, 1);
        this.showToast("success", "Access token revoked");
      } catch (e) {
        console.error("[removeAccess]", e);
        this.showToast("error", "Failed to revoke access token");
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
      if (type === "Business") return "text-warn bg-warn/10 border-warn/30";
      if (type === "Private") return "text-s1 bg-s1/10 border-s1/30";
      return "text-base-200 bg-base-700/40 border-base-600/40";
    },

    botStatusText(s) {
      if (s === "connecting") return "Connecting";
      if (s === "connected") return "Connected";
      if (s === "disconnected") return "Disconnected";
      return s === "online" ? "Online" : "Offline";
    },

    botStatusClass(s) {
      if (s === "connecting") return "text-warn bg-warn/10 border-warn/30";
      if (s === "connected") return "text-s1 bg-s1/10 border-s1/30";
      return "text-danger bg-danger/10 border-danger/30";
    },

    botStatusDotClass(s) {
      if (s === "connecting") return "bg-warn";
      if (s === "connected") return "bg-s1";
      return "bg-danger";
    },

    isConnecting(s) { return s === "connecting"; },
    isConnected(s) { return s === "connected"; },

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

    formatRate(n) {
      const num = Number(n) || 0;
      return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "/day";
    },
  };
}
