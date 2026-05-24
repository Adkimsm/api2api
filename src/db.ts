import type { Env, ModelRow, ModelWithProviderRow, ProviderRow } from "./types";

export function nowIso(): string {
  return new Date().toISOString();
}

export function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export async function listProviders(env: Env): Promise<ProviderRow[]> {
  const result = await env.DB.prepare(
    `SELECT * FROM providers ORDER BY created_at DESC`
  ).all<ProviderRow>();
  return result.results ?? [];
}

export async function getProvider(env: Env, providerId: string): Promise<ProviderRow | null> {
  return env.DB.prepare(`SELECT * FROM providers WHERE id = ?`).bind(providerId).first<ProviderRow>();
}

export async function listModels(env: Env): Promise<ModelWithProviderRow[]> {
  const result = await env.DB.prepare(
    `SELECT
       models.*,
       providers.name AS provider_name,
       providers.base_url AS provider_base_url,
       providers.enabled AS provider_enabled,
       providers.encrypted_api_key AS encrypted_api_key
     FROM models
     INNER JOIN providers ON providers.id = models.provider_id
     ORDER BY providers.name ASC, models.remote_model_id ASC`
  ).all<ModelWithProviderRow>();
  return result.results ?? [];
}

export async function listSelectedModels(env: Env): Promise<ModelWithProviderRow[]> {
  const result = await env.DB.prepare(
    `SELECT
       models.*,
       providers.name AS provider_name,
       providers.base_url AS provider_base_url,
       providers.enabled AS provider_enabled,
       providers.encrypted_api_key AS encrypted_api_key
     FROM models
     INNER JOIN providers ON providers.id = models.provider_id
     WHERE models.selected = 1 AND providers.enabled = 1
     ORDER BY models.public_model_id ASC`
  ).all<ModelWithProviderRow>();
  return result.results ?? [];
}

export async function findSelectedModel(env: Env, publicModelId: string): Promise<ModelWithProviderRow | null> {
  return env.DB.prepare(
    `SELECT
       models.*,
       providers.name AS provider_name,
       providers.base_url AS provider_base_url,
       providers.enabled AS provider_enabled,
       providers.encrypted_api_key AS encrypted_api_key
     FROM models
     INNER JOIN providers ON providers.id = models.provider_id
     WHERE models.public_model_id = ? AND models.selected = 1 AND providers.enabled = 1`
  ).bind(publicModelId).first<ModelWithProviderRow>();
}

export async function getModel(env: Env, modelId: string): Promise<ModelRow | null> {
  return env.DB.prepare(`SELECT * FROM models WHERE id = ?`).bind(modelId).first<ModelRow>();
}

export async function countProviderModels(env: Env, providerId: string): Promise<number> {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS count FROM models WHERE provider_id = ?`).bind(providerId).first<{ count: number }>();
  return row?.count ?? 0;
}
