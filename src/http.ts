import type { Context } from "hono";
import type { Env } from "./types";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
  "content-encoding"
]);

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {})
    }
  });
}

export function error(message: string, status = 400, code = "bad_request"): Response {
  return json({ error: { message, type: code } }, { status });
}

export function corsHeaders(env: Env): Record<string, string> {
  return {
    "access-control-allow-origin": env.CORS_ORIGIN || "*",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "Authorization, Content-Type",
    "access-control-max-age": "86400"
  };
}

export function addCors(response: Response, env: Env): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(env))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function filterResponseHeaders(headers: Headers): Headers {
  const next = new Headers();
  headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      next.set(key, value);
    }
  });
  return next;
}

export function filteredRequestHeaders(request: Request): Headers {
  const next = new Headers(request.headers);
  for (const key of HOP_BY_HOP_HEADERS) {
    next.delete(key);
  }
  next.delete("host");
  return next;
}

export async function readJsonBody<T = Record<string, unknown>>(c: Context<{ Bindings: Env }>): Promise<T | Response> {
  const contentType = c.req.header("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return error("Content-Type must be application/json", 415, "unsupported_media_type");
  }

  try {
    return await c.req.json<T>();
  } catch {
    return error("Invalid JSON body", 400, "invalid_json");
  }
}
