import { Hono } from "hono";
import { encryptApiKey } from "./crypto";
import { error, json, readJsonBody } from "./http";
import { countProviderModels, getProvider, id, listProviders, normalizeBaseUrl, nowIso } from "./db";
import type { Env } from "./types";

type ProviderInput = {
  name?: string;
  baseUrl?: string;
  apiKey?: string;
  enabled?: boolean;
};

function publicProvider(row: Awaited<ReturnType<typeof listProviders>>[number], modelCount = 0) {
  return {
    id: row.id,
    name: row.name,
    baseUrl: row.base_url,
    enabled: row.enabled === 1,
    hasApiKey: Boolean(row.encrypted_api_key),
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    modelCount
  };
}

export const providerRoutes = new Hono<{ Bindings: Env }>();

providerRoutes.get("/", async (c) => {
  const providers = await listProviders(c.env);
  const data = await Promise.all(
    providers.map(async (provider) => publicProvider(provider, await countProviderModels(c.env, provider.id)))
  );
  return json({ data });
});

providerRoutes.post("/", async (c) => {
  const body = await readJsonBody<ProviderInput>(c);
  if (body instanceof Response) return body;

  const name = body.name?.trim();
  const baseUrl = body.baseUrl ? normalizeBaseUrl(body.baseUrl) : "";
  const apiKey = body.apiKey?.trim();

  if (!name) return error("Provider name is required");
  if (!baseUrl) return error("Provider baseUrl is required");
  if (!apiKey) return error("Provider apiKey is required");

  const now = nowIso();
  const providerId = id("prov");
  const encryptedApiKey = await encryptApiKey(apiKey, c.env);

  try {
    await c.env.DB.prepare(
      `INSERT INTO providers (id, name, base_url, encrypted_api_key, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(providerId, name, baseUrl, encryptedApiKey, body.enabled === false ? 0 : 1, now, now).run();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create provider";
    if (message.toLowerCase().includes("unique")) return error("Provider name already exists", 409, "conflict");
    throw err;
  }

  const provider = await getProvider(c.env, providerId);
  return json({ data: provider ? publicProvider(provider) : null }, { status: 201 });
});

providerRoutes.patch("/:id", async (c) => {
  const provider = await getProvider(c.env, c.req.param("id"));
  if (!provider) return error("Provider not found", 404, "not_found");

  const body = await readJsonBody<ProviderInput>(c);
  if (body instanceof Response) return body;

  const name = body.name === undefined ? provider.name : body.name.trim();
  const baseUrl = body.baseUrl === undefined ? provider.base_url : normalizeBaseUrl(body.baseUrl);
  const encryptedApiKey = body.apiKey?.trim()
    ? await encryptApiKey(body.apiKey.trim(), c.env)
    : provider.encrypted_api_key;
  const enabled = body.enabled === undefined ? provider.enabled : body.enabled ? 1 : 0;

  if (!name) return error("Provider name is required");
  if (!baseUrl) return error("Provider baseUrl is required");

  try {
    await c.env.DB.prepare(
      `UPDATE providers
       SET name = ?, base_url = ?, encrypted_api_key = ?, enabled = ?, updated_at = ?
       WHERE id = ?`
    ).bind(name, baseUrl, encryptedApiKey, enabled, nowIso(), provider.id).run();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update provider";
    if (message.toLowerCase().includes("unique")) return error("Provider name already exists", 409, "conflict");
    throw err;
  }

  const updated = await getProvider(c.env, provider.id);
  return json({ data: updated ? publicProvider(updated, await countProviderModels(c.env, provider.id)) : null });
});

providerRoutes.delete("/:id", async (c) => {
  const provider = await getProvider(c.env, c.req.param("id"));
  if (!provider) return error("Provider not found", 404, "not_found");

  await c.env.DB.batch([
    c.env.DB.prepare(`DELETE FROM models WHERE provider_id = ?`).bind(provider.id),
    c.env.DB.prepare(`DELETE FROM providers WHERE id = ?`).bind(provider.id)
  ]);

  return json({ data: { ok: true } });
});
