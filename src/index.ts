import { Hono } from "hono";
import { requireAdmin, requireServiceKey } from "./auth";
import { addCors, corsHeaders, error, json, readJsonBody } from "./http";
import { providerRoutes } from "./providers";
import { modelRoutes, syncProviderModels } from "./models";
import { openaiRoutes } from "./openai";
import { statsRoutes } from "./stats";
import { getAdminToken, getProvider, getServiceApiKey, setAppSetting } from "./db";
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
app.get("/api/config", async (c) => json({ serviceApiKey: await getServiceApiKey(c.env) }));
app.patch("/api/config", async (c) => {
  const body = await readJsonBody<{
    apiKeyEncryptionSecret?: unknown;
    currentAdminToken?: unknown;
    newAdminToken?: unknown;
    serviceApiKey?: unknown;
  }>(c);
  if (body instanceof Response) return body;

  if (body.apiKeyEncryptionSecret !== undefined) {
    return error("API_KEY_ENCRYPTION_SECRET cannot be changed from admin UI", 400, "forbidden_config_key");
  }

  const updates: Record<string, string> = {};
  if (body.serviceApiKey !== undefined) {
    if (typeof body.serviceApiKey !== "string" || !body.serviceApiKey.trim()) {
      return error("SERVICE_API_KEY cannot be empty", 400, "invalid_service_api_key");
    }
    updates.SERVICE_API_KEY = body.serviceApiKey.trim();
  }

  if (body.newAdminToken !== undefined) {
    const expectedAdminToken = await getAdminToken(c.env);
    if (typeof body.currentAdminToken !== "string" || !expectedAdminToken || body.currentAdminToken !== expectedAdminToken) {
      return error("Current ADMIN_TOKEN is invalid", 400, "invalid_admin_token");
    }
    if (typeof body.newAdminToken !== "string" || !body.newAdminToken.trim()) {
      return error("ADMIN_TOKEN cannot be empty", 400, "invalid_admin_token");
    }
    updates.ADMIN_TOKEN = body.newAdminToken.trim();
  }

  if (!updates.SERVICE_API_KEY && !updates.ADMIN_TOKEN) {
    return error("No config changes provided", 400, "empty_config_update");
  }

  await Promise.all(Object.entries(updates).map(([key, value]) => setAppSetting(c.env, key, value)));
  return json({ serviceApiKey: await getServiceApiKey(c.env), adminTokenUpdated: Boolean(updates.ADMIN_TOKEN) });
});
app.post("/api/providers/:id/sync", async (c) => {
  const provider = await getProvider(c.env, c.req.param("id"));
  if (!provider) return error("Provider not found", 404, "not_found");
  return json({ data: await syncProviderModels(c.env, provider) });
});
app.route("/api/providers", providerRoutes);
app.route("/api/models", modelRoutes);
app.route("/api/stats", statsRoutes);

app.use("/v1/*", requireServiceKey);
app.route("/v1", openaiRoutes);

app.notFound((c) => addCors(error("Not found", 404, "not_found"), c.env));

export default app;
