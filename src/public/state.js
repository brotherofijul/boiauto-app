// /src/public/state.js
window.BOIAuto = window.BOIAuto || {};

window.BOIAuto.API_BASE = "/api";

window.BOIAuto.FEATURE_FIELD_MAP = {
  skillUp: "skill_up_running",
  autoWar: "auto_war_running",
  autoWork: "auto_work_running",
};

window.BOIAuto.state = {
  mapAutomate(a) {
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
      error: "",
      skill: a.skill ?? 3,
      pay: a.pay ?? 1,
      currentLevel: a.current_level ?? null,
      targetLevel: a.target_level ?? null,
      pendingAt: a.pending_at ?? null,
      time: "\u2014",
      skillUpRunning: !!a.skill_up_running,
      autoWarRunning: !!a.auto_war_running,
      autoWorkRunning: !!a.auto_work_running,
    };
  },

  mapBot(b) {
    return {
      id: b.id,
      botId: b.bot_id,
      name: b.name,
      token: b.token,
      type: b.type,
      status: b.status,
      showToken: false,
    };
  },

  mapAccess(a) {
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
  },

  isAutomateRunning(a) {
    return !!(a && (a.skillUpRunning || a.autoWarRunning || a.autoWorkRunning));
  },
};
