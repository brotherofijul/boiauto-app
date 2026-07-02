// /src/public/bot.js
window.BOIAuto = window.BOIAuto || {};

const BOT_NAME_MAX = 64;
const BOT_TOKEN_MAX = 256;

window.BOIAuto.bot = {
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
    this.botLoginMode = false;
    this.loginBotToken = "";
    this.loginBotName = "";
    this.loginBotError = "";
    this.showLoginBotToken = false;
    this.showAddBotModal = true;
  },

  toggleBotLoginMode() {
    this.botLoginMode = !this.botLoginMode;
    this.loginBotError = "";
    this.addBotError = "";
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
    if (this.generatedBotToken.length > BOT_TOKEN_MAX) {
      this.addBotError = `Token is too long (max ${BOT_TOKEN_MAX} chars).`;
      return;
    }
    const trimmedName = this.newBotName.trim();
    if (trimmedName.length > BOT_NAME_MAX) {
      this.addBotError = `Name is too long (max ${BOT_NAME_MAX} chars).`;
      return;
    }
    this.addingBot = true;
    this.addBotError = "";
    try {
      const bot = await this.apiPost("/bots", {
        token: this.generatedBotToken,
        name: trimmedName || undefined,
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
    const trimmedName = this.editBotName.trim();
    const trimmedToken = this.editBotToken.trim();
    if (!trimmedName) { this.editBotError = "Name is required."; return; }
    if (!trimmedToken) { this.editBotError = "Token is required."; return; }
    if (trimmedName.length > BOT_NAME_MAX) { this.editBotError = `Name too long (max ${BOT_NAME_MAX}).`; return; }
    if (trimmedToken.length > BOT_TOKEN_MAX) { this.editBotError = `Token too long (max ${BOT_TOKEN_MAX}).`; return; }
    this.savingBot = true;
    this.editBotError = "";
    try {
      await this.apiPatch(`/bots/${this.editingBotId}`, {
        name: trimmedName,
        token: trimmedToken,
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

  async loginWithBotToken() {
    const trimmed = this.loginBotToken.trim();
    if (!trimmed) {
      this.loginBotError = "Bot token is required.";
      return;
    }
    if (trimmed.length > BOT_TOKEN_MAX) {
      this.loginBotError = `Token is too long (max ${BOT_TOKEN_MAX} chars).`;
      return;
    }
    this.loggingInBot = true;
    this.loginBotError = "";
    try {
      const data = await this.apiPost("/bots/verify-token", { token: trimmed });
      await this.loadBots();
      this.showToast("success", `Bot "${data.name}" verified and loaded`);
      this.closeAddBotModal();
    } catch (e) {
      this.loginBotError = e.message;
    } finally {
      this.loggingInBot = false;
    }
  },

  openBotDetail(id) { this.selectedBotId = id; },
  closeBotDetail() { this.selectedBotId = null; },

  get selectedBot() {
    if (!this.selectedBotId) return null;
    return this.bots.find((b) => b.id === this.selectedBotId) || null;
  },

  get selectedBotIndex() {
    if (!this.selectedBotId) return -1;
    return this.bots.findIndex((b) => b.id === this.selectedBotId);
  },

  editSelectedBot() {
    const idx = this.selectedBotIndex;
    if (idx < 0) return;
    this.closeBotDetail();
    this.openEditBotModal(idx);
  },

  removeSelectedBot() {
    const idx = this.selectedBotIndex;
    if (idx < 0) return;
    this.removeBot(idx);
  },

  async saveBotDirect() {
    if (!this.selectedBot) return;
    const name = String(this.selectedBot.name || "").slice(0, BOT_NAME_MAX);
    const token = String(this.selectedBot.token || "").slice(0, BOT_TOKEN_MAX);
    try {
      await this.apiPatch(`/bots/${this.selectedBot.id}`, {
        name,
        token,
        type: this.selectedBot.type,
      });
      await this.loadBots();
      await this.loadAutomates();
    } catch (e) {
      console.error("[saveBotDirect]", e);
    }
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

  removeAccessFromBot(idx) {
    const access = this.accessTokensForBot[idx];
    if (!access) return;
    const realIdx = this.accessList.findIndex((a) => a.id === access.id);
    if (realIdx < 0) return;
    return this.removeAccess(realIdx);
  },
};
