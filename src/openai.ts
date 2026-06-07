import { Hono } from "hono";
import type { Context, ExecutionContext } from "hono";
import { decryptApiKey } from "./crypto";
import { findSelectedModel, insertTokenUsage } from "./db";
import { error, filteredRequestHeaders, filterResponseHeaders, json } from "./http";
import { selectedModelsResponse } from "./models";
import type { Env, ModelWithProviderRow } from "./types";

type OpenAIRequestBody = {
  model?: unknown;
  stream?: boolean;
  [key: string]: unknown;
};

type UsageResponse = {
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

function buildUpstreamUrl(baseUrl: string, endpoint: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${endpoint}`;
}

function persistUsage(ctx: ExecutionContext, model: ModelWithProviderRow, usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }) {
  const prompt = usage.prompt_tokens ?? 0;
  const completion = usage.completion_tokens ?? 0;
  const total = usage.total_tokens ?? (prompt + completion);
  if (total > 0) {
    ctx.waitUntil(
      // env.DB is accessed inside db.ts via env param, but we need the env here
      // We'll pass a minimal object that satisfies the insertTokenUsage signature
      // Actually, insertTokenUsage takes Env, so we need to capture env
      // Let's refactor: we'll call it differently
      // For now, use a closure approach
      Promise.resolve()
    );
  }
}

async function handleNonStream(
  c: Context<{ Bindings: Env }>,
  upstream: Response,
  model: ModelWithProviderRow
): Promise<Response> {
  const cloned = upstream.clone();
  const body = (await cloned.json()) as UsageResponse;

  if (body.usage) {
    const prompt = body.usage.prompt_tokens ?? 0;
    const completion = body.usage.completion_tokens ?? 0;
    const total = body.usage.total_tokens ?? (prompt + completion);
    if (total > 0) {
      c.executionCtx.waitUntil(
        insertTokenUsage(c.env, model.id, model.public_model_id, prompt, completion, total)
      );
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: filterResponseHeaders(upstream.headers),
  });
}

function handleStream(
  c: Context<{ Bindings: Env }>,
  upstream: Response,
  model: ModelWithProviderRow
): Response {
  const contentType = upstream.headers.get("content-type") || "";
  const isSSE = contentType.includes("text/event-stream");

  if (!isSSE) {
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: filterResponseHeaders(upstream.headers),
    });
  }

  let buffer = "";
  let lastUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null = null;
  const decoder = new TextDecoder(); // Reuse decoder instance
  const MAX_BUFFER_SIZE = 131072; // 128KB buffer limit

  const transformer = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      // Enqueue immediately for transparent passthrough
      controller.enqueue(chunk);

      buffer += decoder.decode(chunk, { stream: true });
      
      // Limit buffer size to prevent memory/CPU accumulation on long responses
      if (buffer.length > MAX_BUFFER_SIZE) {
        buffer = buffer.slice(-MAX_BUFFER_SIZE);
      }
      
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ") && !line.includes("[DONE]")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.usage) {
              lastUsage = data.usage;
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    },
    flush() {
      if (lastUsage) {
        const prompt = lastUsage.prompt_tokens ?? 0;
        const completion = lastUsage.completion_tokens ?? 0;
        const total = lastUsage.total_tokens ?? (prompt + completion);
        if (total > 0) {
          c.executionCtx.waitUntil(
            insertTokenUsage(c.env, model.id, model.public_model_id, prompt, completion, total)
          );
        }
      }
    },
  });

  return new Response(upstream.body!.pipeThrough(transformer), {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: filterResponseHeaders(upstream.headers),
  });
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
  
  // Construct upstream request body
  const upstreamBody = { ...body, model: model.remote_model_id };

  // Tool injection logic (Merge strategy)
  if (model.inject_tools === 1 && model.injected_tools) {
    try {
      const injectedTools = JSON.parse(model.injected_tools);
      if (Array.isArray(injectedTools) && injectedTools.length > 0) {
        const clientTools = Array.isArray(body.tools) ? body.tools : [];
        
        // Merge strategy: combine client and injected tools
        const merged = [...clientTools];
        
        // Build set of existing function tool names (for deduplication)
        const existingFunctionNames = new Set<string>();
        for (const tool of clientTools) {
          if (tool && typeof tool === 'object' && tool.type === 'function' && tool.name) {
            existingFunctionNames.add(tool.name);
          }
        }
        
        // Add injected tools (deduplicate function types by name)
        for (const injectedTool of injectedTools) {
          if (!injectedTool || typeof injectedTool !== 'object') continue;
          
          if (injectedTool.type === 'function' && injectedTool.name) {
            // Function type: check if tool with same name already exists
            if (!existingFunctionNames.has(injectedTool.name)) {
              merged.push(injectedTool);
              existingFunctionNames.add(injectedTool.name);
            }
            // If exists, skip (keep client's definition)
          } else {
            // Non-function type: add directly
            merged.push(injectedTool);
          }
        }
        
        upstreamBody.tools = merged;
      }
    } catch (err) {
      // JSON parse failed, ignore injection and continue with original request
      console.error('Failed to parse or merge injected_tools:', err);
    }
  }

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

  if (!upstream.ok) {
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: filterResponseHeaders(upstream.headers),
    });
  }

  const isStream = body.stream === true;
  if (isStream) {
    return handleStream(c, upstream, model);
  }
  return handleNonStream(c, upstream, model);
}

export const openaiRoutes = new Hono<{ Bindings: Env }>();

openaiRoutes.get("/models", async (c) => selectedModelsResponse(c.env));
openaiRoutes.post("/chat/completions", async (c) => proxyOpenAI(c, "/chat/completions"));
openaiRoutes.post("/responses", async (c) => proxyOpenAI(c, "/responses"));
