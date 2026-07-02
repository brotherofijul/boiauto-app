// /src/public/access.js
window.BOIAuto = window.BOIAuto || {};

const ACCESS_NAME_MAX = 64;
const ACCESS_TOKEN_MAX = 256;

window.BOIAuto.access = {
  openAddAccessModal() {
    this.newAccessBotId = this.bots.length > 0 ? this.bots[0].id : "";
    this.newAccessName = "";
    this.newAccessType = "Private";
    this.newAccessPrice = 0;
    this.addAccessError = "";
    this.addingAccess = false;
    this.accessLoginMode = false;
    this.loginAccessToken = "";
    this.loginAccessName = "";
    this.loginAccessError = "";
    this.showLoginAccessToken = false;
    this.showAddAccessModal = true;
  },

  toggleAccessLoginMode() {
    this.accessLoginMode = !this.accessLoginMode;
    this.loginAccessError = "";
    this.addAccessError = "";
  },

  closeAddAccessModal() { this.showAddAccessModal = false; },

  async confirmAddAccess() {
    if (!this.newAccessBotId) { this.addAccessError = "Please select a bot."; return; }
    if (this.newAccessType === "Business" && (!this.newAccessPrice || this.newAccessPrice <= 0)) {
      this.addAccessError = "Business type requires price per day.";
      return;
    }
    const trimmedName = this.newAccessName.trim();
    if (trimmedName.length > ACCESS_NAME_MAX) {
      this.addAccessError = `Name too long (max ${ACCESS_NAME_MAX}).`;
      return;
    }
    this.addingAccess = true;
    this.addAccessError = "";
    try {
      const selectedBot = this.bots.find((b) => b.id === Number(this.newAccessBotId));
      if (!selectedBot) throw new Error("Bot not found");
      await this.apiPost("/access", {
        bot_id: selectedBot.botId,
        name: trimmedName || undefined,
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

  async loginWithAccessToken() {
    const trimmed = this.loginAccessToken.trim();
    if (!trimmed) {
      this.loginAccessError = "Access token is required.";
      return;
    }
    if (trimmed.length > ACCESS_TOKEN_MAX) {
      this.loginAccessError = `Token is too long (max ${ACCESS_TOKEN_MAX} chars).`;
      return;
    }
    this.loggingInAccess = true;
    this.loginAccessError = "";
    try {
      const data = await this.apiPost("/access/verify-token", { token: trimmed });
      const trimmedName = this.loginAccessName.trim();
      if (trimmedName) {
        if (trimmedName.length > ACCESS_NAME_MAX) {
          this.loginAccessError = `Label too long (max ${ACCESS_NAME_MAX}).`;
          return;
        }
        await this.apiPatch(`/access/${data.id}`, { name: trimmedName });
      }
      await this.loadAccess();
      this.showToast("success", `Access "${this.loginAccessName.trim() || data.name || data.access_id}" verified and loaded`);
      this.closeAddAccessModal();
    } catch (e) {
      this.loginAccessError = e.message;
    } finally {
      this.loggingInAccess = false;
    }
  },

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

  removeAutomateFromAccess(idx) {
    const auto = this.automatesUsingAccess[idx];
    if (!auto) return;
    const realIdx = this.automates.findIndex((a) => a.id === auto.id);
    if (realIdx < 0) return;
    return this.removeAutomate(realIdx);
  },

  get selectedAccessIndex() {
    if (!this.selectedAccessId) return -1;
    return this.accessList.findIndex((a) => a.id === this.selectedAccessId);
  },

  removeSelectedAccess() {
    const idx = this.selectedAccessIndex;
    if (idx < 0) return;
    this.closeAccessDetail();
    this.removeAccess(idx);
  },

  accessCountForBot(botId) {
    return this.accessList.filter((a) => a.botId === botId).length;
  },
};
