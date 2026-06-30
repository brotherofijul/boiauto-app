// /src/api/dashboard.js
import { json } from "../utils/response.js";
import { dashboardQueries } from "../db/queries/index.js";

export async function dashboardRouter(req, url, idStr, log) {
  if (req.method === "GET") {
    return json(dashboardQueries.get());
  }
  return json({ error: "Not found" }, 404);
}
