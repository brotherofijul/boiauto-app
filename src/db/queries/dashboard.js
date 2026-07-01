// /src/db/queries/dashboard.js
import db from "../index.js";

export const dashboardQueries = {
  get: () => {
    const bots = db.query("SELECT * FROM bots").all();
    const automates = db.query("SELECT * FROM automates").all();
    const access = db.query("SELECT * FROM access_tokens").all();
    return {
      total_automates: automates.length,
      total_bots: bots.length,
      total_access: access.length,
      connected_bots: bots.filter((b) => b.status === "connected").length,
      online_automates: automates.filter((a) => a.status === "online").length,
      running_skill: automates.filter((a) => a.skill_up_running).length,
      running_training: automates.filter((a) => a.auto_war_running).length,
      running_work: automates.filter((a) => a.auto_work_running).length,
      total_balance: automates.reduce((s, a) => s + (a.balance || 0), 0),
      total_diamond: automates.reduce((s, a) => s + (a.diamond || 0), 0),
    };
  },
};
