// /src/public/helpers.js
window.BOIAuto = window.BOIAuto || {};

window.BOIAuto.helpers = {
  maskToken(token) {
    if (!token) return "\u2014";
    if (token.length <= 8) return "\u2022".repeat(token.length);
    return token.slice(0, 4) + "\u2022".repeat(Math.max(4, token.length - 8)) + token.slice(-4);
  },

  typeClass(type) {
    if (type === "Private" || type === "Dual") return "text-val-green border-val-green/30";
    if (type === "Shared") return "text-val-blue border-val-blue/30";
    if (type === "Business") return "text-warn border-warn/30";
    return "text-base-300 border-base-700/40";
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

  isAutomateRunning(a) {
    if (!a) return false;
    return a.skillUpRunning || a.autoWarRunning || a.autoWorkRunning;
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

  formatRateNoSymbol(n) {
    return (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "/day";
  },

  isAccessFull(a) {
    if (!a) return true;
    return a.type !== "Shared" && a.usageCount >= 1;
  },

  accessUsageText(a) {
    if (!a) return "";
    return a.type === "Shared" ? `${a.usageCount}` : `${a.usageCount}/1`;
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
};
