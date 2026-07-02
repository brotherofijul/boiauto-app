// /src/public/script.js
const VIEW_LOADERS = {
  dashboard: "loadDashboard",
  automate: "loadAutomates",
  bot: "loadBots",
  access: "loadAccess",
};

const DEFAULT_CONFIRM_MODAL = { open: false, title: "", message: "", resolve: null };

const TOAST_DURATION = 4000;
const TOAST_MAX = 5;

function boiauto() {
  const store = {
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

    loginBotToken: "",
    loginBotName: "",
    loginBotError: "",
    loggingInBot: false,
    showLoginBotToken: false,
    showDetailBotToken: false,
    showDetailAccessToken: false,
    botLoginMode: false,
    loginAccessToken: "",
    loginAccessName: "",
    loginAccessError: "",
    loggingInAccess: false,
    showLoginAccessToken: false,
    accessLoginMode: false,

    selectedAutomateId: null,
    selectedAccessId: null,
    selectedBotId: null,
    navbarOpen: false,
    currentView: "dashboard",
    modalStates: [
      "selectedAutomateId", "showAddAutomateModal", "showAddBotModal",
      "showEditBotModal", "showAddAccessModal", "confirmModal.open",
      "navbarOpen", "selectedAccessId", "selectedBotId",
    ],
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

    showToast(type, message, duration = TOAST_DURATION) {
      const id = Date.now() + Math.random();
      this.toasts.push({ id, type, message });
      if (this.toasts.length > TOAST_MAX) this.toasts.splice(0, this.toasts.length - TOAST_MAX);
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
  };

  const modules = [
    window.BOIAuto.state,
    window.BOIAuto.helpers,
    window.BOIAuto.api,
    window.BOIAuto.loaders,
    window.BOIAuto.automate,
    window.BOIAuto.bot,
    window.BOIAuto.access,
  ];
  for (const mod of modules) {
    Object.defineProperties(store, Object.getOwnPropertyDescriptors(mod));
  }
  return store;
}

window.boiauto = boiauto;
