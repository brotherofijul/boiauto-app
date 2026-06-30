// /script.js
const LS_ACCOUNTS = "boiauto_accounts";
const LS_BOTS = "boiauto_bots";

const MOCK_USERS = [
  { name: "ProGamerXYZ",    balance: 152340.50, diamond: 1240 },
  { name: "ShadowKnight",   balance: 89750.25,  diamond: 580 },
  { name: "DragonSlayer99", balance: 245100.00, diamond: 3100 },
  { name: "NightHunter",    balance: 67890.75,  diamond: 850 },
  { name: "ThunderBoltZ",   balance: 178420.30, diamond: 1990 },
];

function genBotId() {
  return "bot_" + Array.from({ length: 6 }, () =>
    Math.random().toString(36).slice(2, 3)
  ).join("");
}

function createAccount() {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name: "",
    bearer: "",
    botId: "",
    botName: "",
    botStatus: "offline",
    type: "Dual",
    balance: 0,
    diamond: 0,
    showBearer: false,
    running: false,
    error: "",
    skill: 3,
    pay: 1,
    currentLevel: null,
    targetLevel: null,
    pendingAt: null,
    time: "\u2014",
    _timer: null,
    skillUpRunning: false,
    autoWarRunning: false,
    autoWorkRunning: false,
  };
}

function createBot() {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    botId: "",
    name: "",
    token: "",
    type: "Dual",
    ratePerDay: 0,
    status: "offline",
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
      this.loadAccounts();
      this.loadBots();
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
      const selectedBot = this.bots.find((b) => b.id === this.newSelectedBotId);
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
        await new Promise((r) => setTimeout(r, 700));
        const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];

        const acc = createAccount();
        acc.bearer = this.newBearer.trim();
        acc.name = user.name;
        acc.balance = user.balance;
        acc.diamond = user.diamond;
        acc.botId = selectedBot.botId;
        acc.botName = selectedBot.name || selectedBot.botId;
        acc.botStatus = selectedBot.status;
        acc.type = selectedBot.type;
        this.accounts.push(acc);
        this.saveAccounts();
        this.closeAddModal();
      } catch (e) {
        this.addError = "Failed to fetch account info. Please try again.";
      } finally {
        this.addingAccount = false;
      }
    },

    removeAccount(idx) {
      const a = this.accounts[idx];
      if (a && a.running) a.running = false;
      if (this.selectedAccountId === a.id) this.selectedAccountId = null;
      this.accounts.splice(idx, 1);
      this.saveAccounts();
    },

    saveAccount(idx) { this.saveAccounts(); },

    toggleFeature(idx, feature) {
      const a = this.accounts[idx];
      const key = feature + "Running";
      if (!a.bearer.trim() || !a.botId) {
        a.error = "Configure Bearer & Bot first.";
        setTimeout(() => { if (a.error === "Configure Bearer & Bot first.") a.error = ""; }, 3000);
        return;
      }
      a[key] = !a[key];
      a.running = a.skillUpRunning;
      if (a[key]) a.botStatus = "online";
      this.saveAccounts();
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

    startAccount(idx) {
      const a = this.accounts[idx];
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
      a.running = true;
      a.botStatus = "online";
      a.error = "";
    },

    stopAccount(idx) {
      const a = this.accounts[idx];
      a.running = false;
      a.botStatus = "offline";
      a.time = "\u2014";
      a.pendingAt = null;
    },

    loadBots() {
      try {
        const arr = JSON.parse(localStorage.getItem(LS_BOTS)) || [];
        this.bots = arr.map((b) => ({ ...createBot(), ...b }));
      } catch {}
    },

    saveBots() {
      try {
        localStorage.setItem(LS_BOTS, JSON.stringify(this.bots));
      } catch {}
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
        await new Promise((r) => setTimeout(r, 700));

        const bot = createBot();
        bot.token = this.newBotToken.trim();
        bot.name = this.newBotName.trim() || ("Bot-" + this.newBotToken.slice(-4));
        bot.botId = genBotId();
        bot.type = this.newBotType;
        bot.ratePerDay = this.newBotType === "Business" ? Number(this.newBotRate) || 0 : 0;
        bot.status = "offline";
        this.bots.push(bot);
        this.saveBots();
        this.closeAddBotModal();
      } catch (e) {
        this.addBotError = "Failed to add bot. Please try again.";
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

    saveEditBot() {
      if (!this.editingBotId) return;
      if (this.editBotType === "Business" && (!this.editBotRate || this.editBotRate <= 0)) {
        this.editBotError = "Rate per day is required for Business type.";
        return;
      }
      this.savingBot = true;
      this.editBotError = "";
      const b = this.bots.find((x) => x.id === this.editingBotId);
      if (!b) {
        this.editBotError = "Bot not found.";
        this.savingBot = false;
        return;
      }
      b.name = this.editBotName.trim() || b.name;
      b.type = this.editBotType;
      b.ratePerDay = this.editBotType === "Business" ? Number(this.editBotRate) || 0 : 0;
      this.accounts.forEach((a) => {
        if (a.botId === b.botId) {
          a.botName = b.name;
          a.type = b.type;
        }
      });
      this.saveBots();
      this.saveAccounts();
      setTimeout(() => {
        this.savingBot = false;
        this.closeEditBotModal();
      }, 400);
    },

    removeBot(idx) {
      const b = this.bots[idx];
      if (!b) return;
      this.bots.splice(idx, 1);
      this.saveBots();
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
        : s === "error"
        ? "text-danger bg-danger/10 border-danger/30"
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
