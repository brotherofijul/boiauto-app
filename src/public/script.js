// /script.js
const API = "/api";

function mapAutomate(a) {
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
  for (let i = 0; i < 18; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const sz = 2 + Math.random() * 3;
    p.style.cssText =
      "left:" + Math.random() * 100 + "%;width:" + sz + "px;height:" + sz +
      "px;animation-duration:" + (14 + Math.random() * 18) + "s;animation-delay:" +
      Math.random() * 14 + "s;";
    if (i % 3 === 0) {
      p.style.background = "rgba(96,165,250,0.15)";
      p.style.boxShadow = "0 0 4px rgba(96,165,250,0.2)";
    }
    c.appendChild(p);
  }
}


function boiauto() {
  return {
    automates: [],
    bots: [],
    accessList: [],
    dashboard: null,
    loadingBots: true,
    loadingAccess: true,
    loadingAutomates: true,
    loadingDashboard: true,
    searchBots: "",
    searchAccess: "",
    searchAutomates: "",
    toasts: [],
    confirmModal: { open: false, title: "", message: "", resolve: null },
    showAddAutomateModal: false,
    showAddBotModal: false,
    showEditBotModal: false,
    showAddAccessModal: false,

    newBearer: "",
    newSelectedAccessId: "",
    showNewBearer: false,
    addAutomateError: "",
    addingAutomate: false,

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

    selectedAutomateId: null,
    navbarOpen: false,
    currentView: "dashboard",
    modalStates: ['selectedAutomateId', 'showAddAutomateModal', 'showAddBotModal', 'showEditBotModal', 'showAddAccessModal', 'confirmModal.open'],
    featureToggles: [
      { key: 'skillUpRunning', feature: 'skillUp', label: 'Skill' },
      { key: 'autoWarRunning', feature: 'autoWar', label: 'Training' },
      { key: 'autoWorkRunning', feature: 'autoWork', label: 'Work' },
    ],

    init() {
      this.loadBots();
      this.loadAutomates();
      this.loadAccess();
      this.loadDashboard();
      spawnParticles();
      this.modalStates.forEach(state => {
        this.$watch(state, () => this.updateScrollLock());
      });

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
      document.body.style.overflow = this.modalStates.some(s => {
        if (s.includes('.')) {
          return s.split('.').reduce((obj, key) => obj?.[key], this);
        }
        return !!this[s];
      }) ? 'hidden' : '';
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
      if (view === 'automate') this.loadAutomates();
      if (view === 'bot') this.loadBots();
      if (view === 'access') this.loadAccess();
    },

    async loadResource(endpoint, stateKey, mapFn, errorMsg, loadingKey) {
      this[loadingKey] = true;
      try {
        const res = await fetch(`${API}${endpoint}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        this[stateKey] = Array.isArray(data) ? data.map(mapFn) : data;
      } catch (e) {
        console.error(`[${stateKey}]`, e);
        this.showToast("error", errorMsg);
      } finally {
        this[loadingKey] = false;
      }
    },

    loadDashboard() { return this.loadResource('/dashboard', 'dashboard', null, 'Failed to load dashboard', 'loadingDashboard'); },
    loadAutomates() { return this.loadResource('/automates', 'automates', mapAutomate, 'Failed to load automates', 'loadingAutomates'); },
    loadBots() { return this.loadResource('/bots', 'bots', mapBot, 'Failed to load bots', 'loadingBots'); },
    loadAccess() { return this.loadResource('/access', 'accessList', mapAccess, 'Failed to load access tokens', 'loadingAccess'); },

    filterBySearch(items, query, fields) {
      if (!query.trim()) return items;
      const q = query.toLowerCase();
      return items.filter(item => fields.some(f => (item[f] || "").toLowerCase().includes(q)));
    },

    setError(item, msg, duration = 3000) {
      item.error = msg;
      if (duration > 0) setTimeout(() => { if (item.error === msg) item.error = ""; }, duration);
    },

    get filteredBots() {
      return this.filterBySearch(this.bots, this.searchBots, ['name', 'botId', 'type']);
    },

    get filteredAccess() {
      return this.filterBySearch(this.accessList, this.searchAccess, ['name', 'accessId', 'botName', 'type']);
    },

    get filteredAutomates() {
      return this.filterBySearch(this.automates, this.searchAutomates, ['name', 'botName', 'accessName']);
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

    openAddAutomateModal() {
      this.newBearer = "";
      this.newSelectedAccessId = this.accessList.length > 0 ? this.accessList[0].accessId : "";
      this.addAutomateError = "";
      this.showNewBearer = false;
      this.addingAutomate = false;
      this.showAddAutomateModal = true;
    },

    closeAddAutomateModal() { this.showAddAutomateModal = false; },

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

    async confirmAddAutomate() {
      if (!this.newBearer.trim()) {
        this.addAutomateError = "Bearer token is required.";
        return;
      }
      if (!this.newSelectedAccessId) {
        this.addAutomateError = "Please select an access.";
        return;
      }
      const selectedAccess = this.accessList.find((a) => a.accessId === this.newSelectedAccessId);
      if (!selectedAccess) {
        this.addAutomateError = "Selected access not found.";
        return;
      }
      if (this.isAccessFull(selectedAccess)) {
        this.addAutomateError = `Access ${selectedAccess.name || selectedAccess.accessId} has reached its limit (max 1 automate for ${selectedAccess.type}).`;
        return;
      }
      this.addingAutomate = true;
      this.addAutomateError = "";
      try {
        const res = await fetch(`${API}/automates`, {
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
        await this.loadAutomates();
        this.closeAddAutomateModal();
        this.showToast("success", "Automate created");
      } catch (e) {
        this.addAutomateError = e.message || "Failed to create automate. Please try again.";
      } finally {
        this.addingAutomate = false;
      }
    },

    async removeAutomate(idx) {
      const a = this.automates[idx];
      if (!a) return;
      const ok = await this.confirmAction(
        "Delete Automate?",
        `This will permanently delete "${a.name}". This cannot be undone.`
      );
      if (!ok) return;
      try {
        const res = await fetch(`${API}/accounts/${a.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete automate");
        if (this.selectedAutomateId === a.id) this.selectedAutomateId = null;
        this.automates.splice(idx, 1);
        this.loadAccess();
        this.showToast("success", "Automate deleted");
      } catch (e) {
        console.error("[removeAutomate]", e);
        this.showToast("error", "Failed to delete automate");
      }
    },

    async saveAutomate(idx) {
      const a = this.automates[idx];
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
        await this.loadAutomates();
      } catch (e) {
        console.error("[saveAutomate]", e);
      }
    },

    async toggleFeature(idx, feature) {
      const a = this.automates[idx];
      if (!a) return;
      const key = feature + "Running";
      if (!a.bearer.trim() || !a.accessId) {
        this.setError(a, "");
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
        this.setError(a, "");
      }
    },

    openDetail(id) { this.selectedAutomateId = id; },
    closeDetail() { this.selectedAutomateId = null; },

    get selectedAutomate() {
      if (!this.selectedAutomateId) return null;
      return this.automates.find((a) => a.id === this.selectedAutomateId) || null;
    },

    get selectedIndex() {
      if (!this.selectedAutomateId) return -1;
      return this.automates.findIndex((a) => a.id === this.selectedAutomateId);
    },

    async startAutomate(idx) {
      const a = this.automates[idx];
      if (!a) return;
      if (!a.bearer.trim()) {
        this.setError(a, "");
        return;
      }
      if (!a.accessId) {
        this.setError(a, "");
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
        this.setError(a, "");
      }
    },

    async stopAutomate(idx) {
      const a = this.automates[idx];
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
        this.setError(a, "");
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
        await this.loadAutomates();
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
      return "text-base-300 bg-base-800/40 border-base-700/40";
    },

    botStatusText(s) {
      if (s === "connecting") return "Connecting";
      if (s === "connected") return "Connected";
      if (s === "disconnected") return "Disconnected";
      return s === "online" ? "Online" : "Offline";
    },

    botStatusClass(s) {
      if (s === "connecting") return "text-warn bg-warn/10 border-warn/30";
      if (s === "connected") return "text-val-green bg-val-green/10 border-val-green/30";
      return "text-base-400 bg-base-800/40 border-base-700/40";
    },

    botStatusDotClass(s) {
      if (s === "connecting") return "bg-warn";
      if (s === "connected") return "bg-val-green";
      return "bg-danger";
    },

    isConnecting(s) { return s === "connecting"; },
    isConnected(s) { return s === "connected"; },

    timeClass(idx) {
      const a = this.automates[idx];
      if (!a || !a.pendingAt) return "text-base-500";
      const rem = new Date(a.pendingAt).getTime() - Date.now();
      if (rem <= 0) return "text-base-500";
      if (rem < 10000) return "text-danger";
      return "text-val-blue";
    },

    timeLow(idx) {
      const pa = this.automates[idx]?.pendingAt;
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
