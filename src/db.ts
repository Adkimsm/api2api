import type { Env, ModelRow, ModelWithProviderRow, ModelTokenStats, PeriodTokenStats, ProviderRow, TokenStats } from "./types";

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

export async function insertTokenUsage(
  env: Env,
  modelId: string,
  publicModelId: string,
  promptTokens: number,
  completionTokens: number,
  totalTokens: number
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO token_usage (id, model_id, public_model_id, prompt_tokens, completion_tokens, total_tokens, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id("usage"), modelId, publicModelId, promptTokens, completionTokens, totalTokens, nowIso()).run();
}

export async function getTokenStats(env: Env, since?: string): Promise<TokenStats> {
  let query = `SELECT COUNT(*) AS total_requests, COALESCE(SUM(total_tokens), 0) AS total_tokens, COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens, COALESCE(SUM(completion_tokens), 0) AS completion_tokens FROM token_usage`;
  const stmt = since ? env.DB.prepare(query + ` WHERE created_at >= ?`).bind(since) : env.DB.prepare(query);
  const row = await stmt.first<TokenStats>();
  return row ?? { total_requests: 0, total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 };
}

export async function getTokenStatsByModel(env: Env, since?: string): Promise<ModelTokenStats[]> {
  let query = `SELECT public_model_id, COUNT(*) AS request_count, COALESCE(SUM(total_tokens), 0) AS total_tokens, COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens, COALESCE(SUM(completion_tokens), 0) AS completion_tokens FROM token_usage`;
  const base = since ? query + ` WHERE created_at >= ?` : query;
  const stmt = since
    ? env.DB.prepare(base + ` GROUP BY public_model_id ORDER BY total_tokens DESC`).bind(since)
    : env.DB.prepare(base + ` GROUP BY public_model_id ORDER BY total_tokens DESC`);
  const result = await stmt.all<ModelTokenStats>();
  return result.results ?? [];
}

export async function getTokenStatsByDay(env: Env, days: number): Promise<PeriodTokenStats[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const result = await env.DB.prepare(
    `SELECT DATE(created_at) AS period, COUNT(*) AS request_count, COALESCE(SUM(total_tokens), 0) AS total_tokens, COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens, COALESCE(SUM(completion_tokens), 0) AS completion_tokens FROM token_usage WHERE created_at >= ? GROUP BY DATE(created_at) ORDER BY period ASC`
  ).bind(since).all<PeriodTokenStats>();
  return result.results ?? [];
}

export async function getTokenStatsByMonth(env: Env, months: number): Promise<PeriodTokenStats[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const result = await env.DB.prepare(
    `SELECT STRFTIME('%Y-%m', created_at) AS period, COUNT(*) AS request_count, COALESCE(SUM(total_tokens), 0) AS total_tokens, COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens, COALESCE(SUM(completion_tokens), 0) AS completion_tokens FROM token_usage WHERE created_at >= ? GROUP BY STRFTIME('%Y-%m', created_at) ORDER BY period ASC`
  ).bind(since.toISOString()).all<PeriodTokenStats>();
  return result.results ?? [];
}
