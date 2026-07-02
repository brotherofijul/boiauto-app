// /src/public/api.js
window.BOIAuto = window.BOIAuto || {};

const API = window.BOIAuto.API_BASE;

window.BOIAuto.api = {
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
};

window.BOIAuto.loaders = {
  loadDashboard() { return this.loadResource("/dashboard", "dashboard", null, "Failed to load dashboard", "loadingDashboard"); },
  loadAutomates() { return this.loadResource("/automates", "automates", window.BOIAuto.state.mapAutomate, "Failed to load automates", "loadingAutomates"); },
  loadBots() { return this.loadResource("/bots", "bots", window.BOIAuto.state.mapBot, "Failed to load bots", "loadingBots"); },
  loadAccess() { return this.loadResource("/access", "accessList", window.BOIAuto.state.mapAccess, "Failed to load access tokens", "loadingAccess"); },
};
