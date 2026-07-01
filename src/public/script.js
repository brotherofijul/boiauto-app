// /script.js
const API = "/api";

const FEATURE_FIELD_MAP = {
  skillUp: "skill_up_running",
  autoWar: "auto_war_running",
  autoWork: "auto_work_running",
};

const VIEW_LOADERS = {
  dashboard: "loadDashboard",
  automate: "loadAutomates",
  bot: "loadBots",
  access: "loadAccess",
};

const DEFAULT_CONFIRM_MODAL = { open: false, title: "", message: "", resolve: null };

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
    confirmModal: { ...DEFAULT_CONFIRM_MODAL },
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
    addAccessError: "",
    addingAccess: false,

    selectedAutomateId: null,
    selectedAccessId: null,
    selectedBotId: null,
    navbarOpen: false,
    currentView: "dashboard",
    modalStates: ["selectedAutomateId", "showAddAutomateModal", "showAddBotModal", "showEditBotModal", "showAddAccessModal", "confirmModal.open", "navbarOpen", "selectedAccessId", "selectedBotId"],
    featureToggles: [
      { key: "skillUpRunning", feature: "skillUp", label: "Skill" },
      { key: "autoWarRunning", feature: "autoWar", label: "Training" },
      { key: "autoWorkRunning", feature: "autoWork", label: "Work" },
    ],

    init() {
      this.loadBots();
      this.loadAutomates();
      this.loadAccess();
      this.loadDashboard();

      this.modalStates.forEach((state) => {
        this.$watch(state, () => this.updateScrollLock());
      });

      this.$watch("bots", (bots) => {
        if (this.newlyAddedBotId && this.showAddBotModal) {
          const bot = bots.find((b) => b.botId === this.newlyAddedBotId);
          if (bot && bot.status === "connected") {
            this.botConnectedWhileOpen = true;
          }
        }
      });
    },

    updateScrollLock() {
      const locked = this.modalStates.some((s) => {
        if (s.includes(".")) {
          return s.split(".").reduce((obj, key) => obj?.[key], this);
        }
        return !!this[s];
      });
      document.body.style.overflow = locked ? "hidden" : "";
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
      const loader = VIEW_LOADERS[view];
      if (loader) this[loader]();
    },

    // --- Shared API helpers ---

    async loadResource(endpoint, stateKey, mapFn, errorMsg, loadingKey) {
      this[loadingKey] = true;
      try {
        const res = await fetch(`${API}${endpoint}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        this[stateKey] = Array.isArray(data) ? data.map(mapFn) : data;
      } catch {
        this.showToast("error", errorMsg);
      } finally {
        this[loadingKey] = false;
      }
    },

    async apiPost(endpoint, body) {
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Request failed");
      }
      return res.json();
    },

    async apiPatch(endpoint, body) {
      const res = await fetch(`${API}${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Request failed");
      }
      return res;
    },

    async apiDelete(endpoint) {
      const res = await fetch(`${API}${endpoint}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res;
    },

    async confirmAndDelete({ array, idx, endpoint, label, confirmTitle, confirmMsg, successMsg, afterDelete }) {
      const item = array[idx];
      if (!item) return;
      const ok = await this.confirmAction(confirmTitle, confirmMsg);
      if (!ok) return;
      try {
        await this.apiDelete(`${endpoint}/${item.id}`);
        if (afterDelete) afterDelete(item);
        array.splice(idx, 1);
        this.showToast("success", successMsg);
      } catch {
        this.showToast("error", `Failed to delete ${label}`);
      }
    },

    // --- Data loaders ---

    loadDashboard() { return this.loadResource("/dashboard", "dashboard", null, "Failed to load dashboard", "loadingDashboard"); },
    loadAutomates() { return this.loadResource("/automates", "automates", mapAutomate, "Failed to load automates", "loadingAutomates"); },
    loadBots() { return this.loadResource("/bots", "bots", mapBot, "Failed to load bots", "loadingBots"); },
    loadAccess() { return this.loadResource("/access", "accessList", mapAccess, "Failed to load access tokens", "loadingAccess"); },

    // --- Computed ---

    get chartData() {
      const a = this.dashboard?.total_automates ?? 0;
      const b = this.dashboard?.total_access ?? 0;
      const c = this.dashboard?.total_bots ?? 0;
      const total = a + b + c;
      if (total === 0) return { svg: "", total: 0, legend: [] };
      const r = 32;
      const circ = 2 * Math.PI * r;
      const segments = [
        { label: "Automate", value: a, color: "#34d399" },
        { label: "Access", value: b, color: "#f5a623" },
        { label: "Bot", value: c, color: "#60a5fa" },
      ];
      let accumulated = 0;
      let svgCircles = "";
      const legend = [];
      for (const seg of segments) {
        const frac = seg.value / total;
        const dash = frac * circ;
        const offset = -accumulated * circ;
        svgCircles += `<circle cx="40" cy="40" r="${r}" fill="none" stroke="${seg.color}" stroke-width="8" stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${offset}"/>`;
        legend.push({ label: seg.label, pct: (frac * 100).toFixed(0), color: seg.color });
        accumulated += frac;
      }
      return { svg: svgCircles, total, legend };
    },

    filterBySearch(items, query, fields) {
      if (!query.trim()) return items;
      const q = query.toLowerCase();
      return items.filter((item) => fields.some((f) => (item[f] || "").toLowerCase().includes(q)));
    },

    get filteredBots() {
      return this.filterBySearch(this.bots, this.searchBots, ["name", "botId", "type"]);
    },

    get filteredAccess() {
      return this.filterBySearch(this.accessList, this.searchAccess, ["name", "accessId", "botName", "type"]);
    },

    get filteredAutomates() {
      return this.filterBySearch(this.automates, this.searchAutomates, ["name", "botName", "accessName"]);
    },

    // --- Toast & Confirm ---

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

    closeConfirm(result) {
      this.confirmModal.resolve?.(result);
      this.confirmModal = { ...DEFAULT_CONFIRM_MODAL };
    },

    confirmYes() { this.closeConfirm(true); },
    confirmNo() { this.closeConfirm(false); },

    // --- Automate CRUD ---

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
      return a.type === "Shared" ? `${a.usageCount}` : `${a.usageCount}/1`;
    },

    isAccessFull(a) {
      if (!a) return true;
      return a.type !== "Shared" && a.usageCount >= 1;
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
        this.addAutomateError = `Access ${selectedAccess.name || selectedAccess.accessId} has reached its limit.`;
        return;
      }
      this.addingAutomate = true;
      this.addAutomateError = "";
      try {
        await this.apiPost("/automates", {
          bearer: this.newBearer.trim(),
          access_id: selectedAccess.accessId,
        });
        await this.loadAutomates();
        this.closeAddAutomateModal();
        this.showToast("success", "Automate created");
      } catch (e) {
        this.addAutomateError = e.message;
      } finally {
        this.addingAutomate = false;
      }
    },

    removeAutomate(idx) {
      return this.confirmAndDelete({
        array: this.automates,
        idx,
        endpoint: "/automates",
        label: "automate",
        confirmTitle: "Delete Automate?",
        confirmMsg: `This will permanently delete "${this.automates[idx]?.name}". This cannot be undone.`,
        successMsg: "Automate deleted",
        afterDelete: (item) => {
          if (this.selectedAutomateId === item.id) this.selectedAutomateId = null;
          this.loadAccess();
        },
      });
    },

    async saveAutomate(idx) {
      const a = this.automates[idx];
      if (!a) return;
      try {
        await this.apiPatch(`/automates/${a.id}`, {
          bearer: a.bearer,
          access_id: a.accessId,
        });
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
        a.error = "Configure Bearer & Access first.";
        setTimeout(() => { if (a.error === "Configure Bearer & Access first.") a.error = ""; }, 3000);
        return;
      }
      const newValue = !a[key];
      try {
        await this.apiPatch(`/automates/${a.id}`, {
          [FEATURE_FIELD_MAP[feature]]: newValue ? 1 : 0,
        });
        a[key] = newValue;
        a.running = a.skillUpRunning;
        a.error = "";
        if (newValue) a.botStatus = "connected";
      } catch {
        a.error = "Failed to toggle feature.";
        setTimeout(() => { if (a.error === "Failed to toggle feature.") a.error = ""; }, 3000);
      }
    },

    async stopAllFeatures(idx) {
      const a = this.automates[idx];
      if (!a) return;
      try {
        await this.apiPatch(`/automates/${a.id}`, {
          skill_up_running: 0,
          auto_war_running: 0,
          auto_work_running: 0,
        });
        a.running = false;
        a.skillUpRunning = false;
        a.autoWarRunning = false;
        a.autoWorkRunning = false;
        a.botStatus = "disconnected";
        a.time = "\u2014";
        a.pendingAt = null;
        a.error = "";
      } catch {
        a.error = "Failed to stop.";
        setTimeout(() => { if (a.error === "Failed to stop.") a.error = ""; }, 3000);
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

    // --- Bot CRUD ---

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
        const data = await this.apiPost("/bots/generate-token", {});
        this.generatedBotToken = data.token;
        this.tokenCopied = false;
      } catch {
        this.addBotError = "Failed to generate token.";
      } finally {
        this.generatingToken = false;
      }
    },

    async copyBotToken() {
      if (!this.generatedBotToken) return;
      await this.copyToClipboard(this.generatedBotToken, "Bot token copied");
      this.tokenCopied = true;
      setTimeout(() => { this.tokenCopied = false; }, 2000);
    },

    async copyToClipboard(text, toastMsg = "Copied to clipboard") {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        this.showToast("success", toastMsg);
      } catch {
        this.showToast("error", "Failed to copy");
      }
    },

    async confirmAddBot() {
      if (this.botConnectedWhileOpen || this.newlyAddedBotId) {
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
        const bot = await this.apiPost("/bots", {
          token: this.generatedBotToken,
          name: this.newBotName.trim() || undefined,
          type: this.newBotType,
        });
        this.newlyAddedBotId = bot.bot_id;
        await this.loadBots();
        this.showToast("success", "Bot created. Waiting for client to connect.");
      } catch (e) {
        this.addBotError = e.message;
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
      if (!this.editBotName.trim()) { this.editBotError = "Name is required."; return; }
      if (!this.editBotToken.trim()) { this.editBotError = "Token is required."; return; }
      this.savingBot = true;
      this.editBotError = "";
      try {
        await this.apiPatch(`/bots/${this.editingBotId}`, {
          name: this.editBotName.trim(),
          token: this.editBotToken.trim(),
          type: this.editBotType,
        });
        await this.loadBots();
        await this.loadAutomates();
        this.closeEditBotModal();
        this.showToast("success", "Bot updated");
      } catch (e) {
        this.editBotError = e.message;
      } finally {
        this.savingBot = false;
      }
    },

    removeBot(idx) {
      return this.confirmAndDelete({
        array: this.bots,
        idx,
        endpoint: "/bots",
        label: "bot",
        confirmTitle: "Delete Bot?",
        confirmMsg: `This will permanently delete "${this.bots[idx]?.name}" and all access tokens linked to it. This cannot be undone.`,
        successMsg: "Bot deleted",
        afterDelete: () => this.loadAccess(),
      });
    },

    // --- Access CRUD ---

    openAddAccessModal() {
      this.newAccessBotId = this.bots.length > 0 ? this.bots[0].id : "";
      this.newAccessName = "";
      this.newAccessType = "Private";
      this.newAccessPrice = 0;
      this.addAccessError = "";
      this.addingAccess = false;
      this.showAddAccessModal = true;
    },

    closeAddAccessModal() { this.showAddAccessModal = false; },

    async confirmAddAccess() {
      if (!this.newAccessBotId) { this.addAccessError = "Please select a bot."; return; }
      if (this.newAccessType === "Business" && (!this.newAccessPrice || this.newAccessPrice <= 0)) {
        this.addAccessError = "Business type requires price per day.";
        return;
      }
      this.addingAccess = true;
      this.addAccessError = "";
      try {
        const selectedBot = this.bots.find((b) => b.id === Number(this.newAccessBotId));
        if (!selectedBot) throw new Error("Bot not found");
        await this.apiPost("/access", {
          bot_id: selectedBot.botId,
          name: this.newAccessName.trim() || undefined,
          type: this.newAccessType,
          price_per_day: this.newAccessType === "Business" ? Number(this.newAccessPrice) || 0 : 0,
        });
        await this.loadAccess();
        this.closeAddAccessModal();
        this.showToast("success", "Access token created");
      } catch (e) {
        this.addAccessError = e.message;
      } finally {
        this.addingAccess = false;
      }
    },

    removeAccess(idx) {
      return this.confirmAndDelete({
        array: this.accessList,
        idx,
        endpoint: "/access",
        label: "access token",
        confirmTitle: "Revoke Access?",
        confirmMsg: `This will permanently revoke access token "${this.accessList[idx]?.name || this.accessList[idx]?.accessId}". The recipient will no longer be able to use it.`,
        successMsg: "Access token revoked",
      });
    },


    // --- Access Detail ---

    openAccessDetail(id) { this.selectedAccessId = id; },
    closeAccessDetail() { this.selectedAccessId = null; },

    get selectedAccess() {
      if (!this.selectedAccessId) return null;
      return this.accessList.find((a) => a.id === this.selectedAccessId) || null;
    },

    get automatesUsingAccess() {
      if (!this.selectedAccessId) return [];
      const access = this.accessList.find((a) => a.id === this.selectedAccessId);
      if (!access) return [];
      return this.automates.filter((a) => a.accessId === access.accessId);
    },


    // --- Bot Detail ---

    openBotDetail(id) { this.selectedBotId = id; },
    closeBotDetail() { this.selectedBotId = null; },

    get selectedBot() {
      if (!this.selectedBotId) return null;
      return this.bots.find((b) => b.id === this.selectedBotId) || null;
    },

    get automatesUsingBot() {
      if (!this.selectedBotId) return [];
      const bot = this.bots.find((b) => b.id === this.selectedBotId);
      if (!bot) return [];
      return this.automates.filter((a) => a.botId === bot.botId);
    },

    get accessTokensForBot() {
      if (!this.selectedBotId) return [];
      const bot = this.bots.find((b) => b.id === this.selectedBotId);
      if (!bot) return [];
      return this.accessList.filter((a) => a.botId === bot.botId);
    },

    // --- Display helpers ---

    maskToken(token) {
      if (!token) return "\u2014";
      if (token.length <= 8) return "\u2022".repeat(token.length);
      return token.slice(0, 4) + "\u2022".repeat(Math.max(4, token.length - 8)) + token.slice(-4);
    },

    typeClass() {
      return "text-base-300 bg-base-800/40 border-base-700/40";
    },

    botStatusText(s) {
      if (s === "connecting") return "Connecting";
      if (s === "connected") return "Connected";
      if (s === "disconnected") return "Disconnected";
      return "Unknown";
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
      if (!a?.pendingAt) return "text-base-500";
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
      return (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    formatNumber(n) {
      return (Number(n) || 0).toLocaleString("en-US");
    },

    formatRate(n) {
      return "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "/day";
    },
  };
}
