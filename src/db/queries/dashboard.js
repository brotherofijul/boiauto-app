// /src/db/queries/dashboard.js
import db from "../index.js";

export const dashboardQueries = {
  get: () => {
    const bots = db.query("SELECT * FROM bots").all();
    const accounts = db.query("SELECT * FROM accounts").all();
    const access = db.query("SELECT * FROM access_tokens").all();
    return {
      total_automates: accounts.length,
      total_bots: bots.length,
      total_access: access.length,
      connected_bots: bots.filter((b) => b.status === "connected").length,
      online_automates: accounts.filter((a) => a.status === "online").length,
      running_skill: accounts.filter((a) => a.skill_up_running).length,
      running_training: accounts.filter((a) => a.auto_war_running).length,
      running_work: accounts.filter((a) => a.auto_work_running).length,
      total_balance: accounts.reduce((s, a) => s + (a.balance || 0), 0),
      total_diamond: accounts.reduce((s, a) => s + (a.diamond || 0), 0),
    };
  },
};
