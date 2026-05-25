import { Hono } from "hono";
import { requireAdmin, requireServiceKey } from "./auth";
import { addCors, corsHeaders, error, json } from "./http";
import { providerRoutes } from "./providers";
import { modelRoutes, syncProviderModels } from "./models";
import { openaiRoutes } from "./openai";
import { getProvider } from "./db";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
  console.error(err);
  return addCors(error(err.message || "Internal server error", 500, "internal_error"), c.env);
});

app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(c.env) });
  }
  await next();
  c.res = addCors(c.res, c.env);
});

app.get("/health", (c) => json({ ok: true }));

app.use("/api/*", requireAdmin);
app.get("/api/config", (c) => json({ serviceApiKey: c.env.SERVICE_API_KEY || "" }));
app.post("/api/providers/:id/sync", async (c) => {
  const provider = await getProvider(c.env, c.req.param("id"));
  if (!provider) return error("Provider not found", 404, "not_found");
  return json({ data: await syncProviderModels(c.env, provider) });
});
app.route("/api/providers", providerRoutes);
app.route("/api/models", modelRoutes);

app.use("/v1/*", requireServiceKey);
app.route("/v1", openaiRoutes);

app.notFound((c) => addCors(error("Not found", 404, "not_found"), c.env));

export default app;
