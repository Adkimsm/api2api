import { Hono } from "hono";
import { json } from "./http";
import { getTokenStats, getTokenStatsByModel, getTokenStatsByDay, getTokenStatsByMonth } from "./db";
import type { Env } from "./types";

export const statsRoutes = new Hono<{ Bindings: Env }>();

statsRoutes.get("/tokens", async (c) => {
  const period = c.req.query("period");
  let since: string | undefined;

  if (period === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    since = d.toISOString();
  } else if (period === "week") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    since = d.toISOString();
  } else if (period === "month") {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    since = d.toISOString();
  }

  const [overall, byModel] = await Promise.all([
    getTokenStats(c.env, since),
    getTokenStatsByModel(c.env, since),
  ]);

  return json({ overall, byModel });
});

statsRoutes.get("/tokens/trend", async (c) => {
  const range = c.req.query("range") || "30d";
  let data: Awaited<ReturnType<typeof getTokenStatsByDay>> | Awaited<ReturnType<typeof getTokenStatsByMonth>>;

  if (range === "7d") {
    data = await getTokenStatsByDay(c.env, 7);
  } else if (range === "30d") {
    data = await getTokenStatsByDay(c.env, 30);
  } else if (range === "12m") {
    data = await getTokenStatsByMonth(c.env, 12);
  } else {
    data = await getTokenStatsByDay(c.env, 30);
  }

  return json({ data, range });
});
