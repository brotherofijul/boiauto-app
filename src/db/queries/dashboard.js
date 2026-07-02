// /src/db/queries/dashboard.js
import db from "../index.js";

export const dashboardQueries = {
  get: () => {
    const botStats = db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'connected' THEN 1 ELSE 0 END) AS connected
      FROM bots
    `).get();
    const automateStats = db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) AS online,
        SUM(CASE WHEN skill_up_running = 1 THEN 1 ELSE 0 END) AS running_skill,
        SUM(CASE WHEN auto_war_running = 1 THEN 1 ELSE 0 END) AS running_training,
        SUM(CASE WHEN auto_work_running = 1 THEN 1 ELSE 0 END) AS running_work,
        COALESCE(SUM(balance), 0) AS total_balance,
        COALESCE(SUM(diamond), 0) AS total_diamond
      FROM automates
    `).get();
    const accessStats = db.query(`SELECT COUNT(*) AS total FROM access_tokens`).get();
    return {
      total_automates: automateStats.total || 0,
      total_bots: botStats.total || 0,
      total_access: accessStats.total || 0,
      connected_bots: botStats.connected || 0,
      online_automates: automateStats.online || 0,
      running_skill: automateStats.running_skill || 0,
      running_training: automateStats.running_training || 0,
      running_work: automateStats.running_work || 0,
      total_balance: automateStats.total_balance || 0,
      total_diamond: automateStats.total_diamond || 0,
    };
  },
};
