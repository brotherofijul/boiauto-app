// /src/public/automate.js
window.BOIAuto = window.BOIAuto || {};

const FEATURE_FIELD_MAP = window.BOIAuto.FEATURE_FIELD_MAP;

window.BOIAuto.automate = {
  openAddAutomateModal() {
    this.newBearer = "";
    this.newSelectedAccessId = this.accessList.length > 0 ? this.accessList[0].accessId : "";
    this.addAutomateError = "";
    this.showNewBearer = false;
    this.addingAutomate = false;
    this.showAddAutomateModal = true;
  },

  closeAddAutomateModal() { this.showAddAutomateModal = false; },

  async confirmAddAutomate() {
    if (!this.newBearer.trim()) {
      this.addAutomateError = "Bearer token is required.";
      return;
    }
    if (this.newBearer.trim().length > 4096) {
      this.addAutomateError = "Bearer token is too long (max 4096 chars).";
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
        skill: a.skill,
        pay: a.pay,
      });
    } catch (e) {
      console.error("[saveAutomate]", e);
    }
  },

  async saveAutomateConfig(idx) {
    const a = this.automates[idx];
    if (!a) return;
    try {
      await this.apiPatch(`/automates/${a.id}`, {
        skill: a.skill,
        pay: a.pay,
      });
    } catch (e) {
      console.error("[saveAutomateConfig]", e);
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
};
