import { Hono } from "hono";
import { decryptApiKey } from "./crypto";
import { error, json } from "./http";
import { getModel, getProvider, id, listModels, listProviders, listSelectedModels, nowIso } from "./db";
import type { Env, ProviderRow } from "./types";

type OpenAIModelResponse = {
  data?: Array<{ id?: string }>;
};

type ModelPatchInput = {
  selected?: boolean;
  publicModelId?: string;
};

type ModelCreateInput = {
  providerId?: string;
  remoteModelId?: string;
  publicModelId?: string;
  selected?: boolean;
};

function publicModel(row: Awaited<ReturnType<typeof listModels>>[number]) {
  return {
    id: row.id,
    providerId: row.provider_id,
    providerName: row.provider_name,
    providerEnabled: row.provider_enabled === 1,
    remoteModelId: row.remote_model_id,
    publicModelId: row.public_model_id,
    selected: row.selected === 1,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function defaultPublicModelId(provider: ProviderRow, remoteModelId: string): string {
  return `${provider.name}/${remoteModelId}`;
}

export async function syncProviderModels(env: Env, provider: ProviderRow) {
  if (provider.enabled !== 1) {
    return { providerId: provider.id, imported: 0, skipped: true };
  }

  const apiKey = await decryptApiKey(provider.encrypted_api_key, env);
  const response = await fetch(`${provider.base_url}/models`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: "application/json"
    }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to sync ${provider.name}: ${response.status} ${text.slice(0, 500)}`);
  }

  const payload = (await response.json()) as OpenAIModelResponse;
  const remoteModelIds = [...new Set((payload.data ?? []).map((model: { id?: string }) => model.id).filter(Boolean))] as string[];
  const now = nowIso();

  const statements = remoteModelIds.map((remoteModelId) =>
    env.DB.prepare(
      `INSERT INTO models (id, provider_id, remote_model_id, public_model_id, selected, last_seen_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?)
       ON CONFLICT(provider_id, remote_model_id) DO UPDATE SET
         last_seen_at = excluded.last_seen_at,
         updated_at = excluded.updated_at`
    ).bind(id("model"), provider.id, remoteModelId, defaultPublicModelId(provider, remoteModelId), now, now, now)
  );

  // Remove models that no longer exist on the upstream provider
  if (remoteModelIds.length > 0) {
    const placeholders = remoteModelIds.map(() => "?").join(",");
    statements.push(
      env.DB.prepare(
        `DELETE FROM models WHERE provider_id = ? AND remote_model_id NOT IN (${placeholders})`
      ).bind(provider.id, ...remoteModelIds)
    );
  } else {
    statements.push(
      env.DB.prepare(`DELETE FROM models WHERE provider_id = ?`).bind(provider.id)
    );
  }

  statements.push(
    env.DB.prepare(`UPDATE providers SET last_synced_at = ?, updated_at = ? WHERE id = ?`).bind(now, now, provider.id)
  );

  await env.DB.batch(statements);

  return { providerId: provider.id, imported: remoteModelIds.length, skipped: false };
}

export const modelRoutes = new Hono<{ Bindings: Env }>();

modelRoutes.get("/", async (c) => {
  const models = await listModels(c.env);
  return json({ data: models.map(publicModel) });
});

modelRoutes.post("/", async (c) => {
  let body: ModelCreateInput;
  try {
    body = await c.req.json<ModelCreateInput>();
  } catch {
    return error("Invalid JSON body", 400, "invalid_json");
  }

  const providerId = body.providerId?.trim();
  const remoteModelId = body.remoteModelId?.trim();
  if (!providerId) return error("providerId is required");
  if (!remoteModelId) return error("remoteModelId is required");

  const provider = await getProvider(c.env, providerId);
  if (!provider) return error("Provider not found", 404, "not_found");

  const publicModelId = body.publicModelId?.trim() || defaultPublicModelId(provider, remoteModelId);
  const selected = body.selected ? 1 : 0;
  const now = nowIso();
  const modelId = id("model");

  try {
    await c.env.DB.prepare(
      `INSERT INTO models (id, provider_id, remote_model_id, public_model_id, selected, last_seen_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(modelId, provider.id, remoteModelId, publicModelId, selected, now, now, now).run();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create model";
    const lower = message.toLowerCase();
    if (lower.includes("unique") && lower.includes("public_model_id")) {
      return error("publicModelId already exists", 409, "conflict");
    }
    if (lower.includes("unique")) {
      return error("Model already exists for this provider", 409, "conflict");
    }
    throw err;
  }

  return json({ data: { id: modelId } }, { status: 201 });
});

modelRoutes.delete("/:id", async (c) => {
  const model = await getModel(c.env, c.req.param("id"));
  if (!model) return error("Model not found", 404, "not_found");
  await c.env.DB.prepare(`DELETE FROM models WHERE id = ?`).bind(model.id).run();
  return json({ data: { ok: true } });
});

modelRoutes.post("/sync-all", async (c) => {
  const providers = await listProviders(c.env);
  
  // Parallelize sync operations to reduce total time
  const results = await Promise.allSettled(
    providers.map(provider => syncProviderModels(c.env, provider))
  );
  
  // Normalize results
  return json({ 
    data: results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const provider = providers[index];
        const message = result.reason instanceof Error ? result.reason.message : "Unknown error";
        return { 
          providerId: provider.id, 
          providerName: provider.name, 
          error: message,
          skipped: false 
        };
      }
    })
  });
});

modelRoutes.patch("/:id", async (c) => {
  const model = await getModel(c.env, c.req.param("id"));
  if (!model) return error("Model not found", 404, "not_found");

  let body: ModelPatchInput;
  try {
    body = await c.req.json<ModelPatchInput>();
  } catch {
    return error("Invalid JSON body", 400, "invalid_json");
  }

  const publicModelId = body.publicModelId === undefined ? model.public_model_id : body.publicModelId.trim();
  const selected = body.selected === undefined ? model.selected : body.selected ? 1 : 0;
  if (!publicModelId) return error("publicModelId is required");

  try {
    await c.env.DB.prepare(
      `UPDATE models SET public_model_id = ?, selected = ?, updated_at = ? WHERE id = ?`
    ).bind(publicModelId, selected, nowIso(), model.id).run();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update model";
    if (message.toLowerCase().includes("unique")) return error("publicModelId already exists", 409, "conflict");
    throw err;
  }

  return json({ data: { ok: true } });
});

modelRoutes.post("/providers/:id/sync", async (c) => {
  const provider = await getProvider(c.env, c.req.param("id"));
  if (!provider) return error("Provider not found", 404, "not_found");
  return json({ data: await syncProviderModels(c.env, provider) });
});

export async function selectedModelsResponse(env: Env): Promise<Response> {
  const models = await listSelectedModels(env);
  return json({
    object: "list",
    data: models.map((model) => ({
      id: model.public_model_id,
      object: "model",
      created: 0,
      owned_by: model.provider_name
    }))
  });
}
