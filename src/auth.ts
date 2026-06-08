import type { Context, Next } from "hono";
import { getAdminToken, getServiceApiKey } from "./db";
import type { Env } from "./types";
import { error } from "./http";

function bearerToken(c: Context<{ Bindings: Env }>): string | null {
  const authorization = c.req.header("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function checkSecret(actual: string | null, expected: string | undefined): boolean {
  return Boolean(actual && expected && actual === expected);
}

export async function requireAdmin(c: Context<{ Bindings: Env }>, next: Next): Promise<Response | void> {
  if (!checkSecret(bearerToken(c), await getAdminToken(c.env))) {
    return error("Unauthorized", 401, "unauthorized");
  }
  await next();
}

export async function requireServiceKey(c: Context<{ Bindings: Env }>, next: Next): Promise<Response | void> {
  if (!checkSecret(bearerToken(c), await getServiceApiKey(c.env))) {
    return error("Unauthorized", 401, "unauthorized");
  }
  await next();
}
