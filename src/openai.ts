import { Hono } from "hono";
import type { Context } from "hono";
import { decryptApiKey } from "./crypto";
import { findSelectedModel } from "./db";
import { error, filteredRequestHeaders, filterResponseHeaders, json } from "./http";
import { selectedModelsResponse } from "./models";
import type { Env } from "./types";

type OpenAIRequestBody = {
  model?: unknown;
  [key: string]: unknown;
};

function buildUpstreamUrl(baseUrl: string, endpoint: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${endpoint}`;
}

async function proxyOpenAI(c: Context<{ Bindings: Env }>, endpoint: "/chat/completions" | "/responses") {
  let body: OpenAIRequestBody;
  try {
    body = await c.req.json<OpenAIRequestBody>();
  } catch {
    return error("Invalid JSON body", 400, "invalid_json");
  }

  if (typeof body.model !== "string" || !body.model.trim()) {
    return error("model is required", 400, "missing_model");
  }

  const model = await findSelectedModel(c.env, body.model);
  if (!model) {
    return json({ error: { message: `Model not found: ${body.model}`, type: "invalid_request_error", code: "model_not_found" } }, { status: 404 });
  }

  const providerApiKey = await decryptApiKey(model.encrypted_api_key, c.env);
  const upstreamBody = { ...body, model: model.remote_model_id };
  const headers = filteredRequestHeaders(c.req.raw);
  headers.set("authorization", `Bearer ${providerApiKey}`);
  headers.set("content-type", "application/json");
  headers.set("accept", c.req.header("accept") || "*/*");

  const upstream = await fetch(buildUpstreamUrl(model.provider_base_url, endpoint), {
    method: "POST",
    headers,
    body: JSON.stringify(upstreamBody),
    redirect: "follow"
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: filterResponseHeaders(upstream.headers)
  });
}

export const openaiRoutes = new Hono<{ Bindings: Env }>();

openaiRoutes.get("/models", async (c) => selectedModelsResponse(c.env));
openaiRoutes.post("/chat/completions", async (c) => proxyOpenAI(c, "/chat/completions"));
openaiRoutes.post("/responses", async (c) => proxyOpenAI(c, "/responses"));
