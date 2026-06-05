import { clearToken, getToken, UNAUTH_EVENT } from "./auth";
import type { TokenStatsResponse, TokenTrendResponse } from "./types";

interface ApiOptions {
  method?: string;
  body?: BodyInit | null;
  headers?: Record<string, string>;
}

export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const res = await fetch(path, {
    method: options.method || "GET",
    body: options.body,
    headers: {
      Authorization: "Bearer " + getToken(),
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Response is not JSON: " + text.slice(0, 300));
    }
  }

  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event(UNAUTH_EVENT));
  }

  if (!res.ok) {
    throw new Error((data.error && data.error.message) || "Request failed: " + res.status);
  }

  return data as T;
}

export async function fetchTokenStats(period?: string): Promise<TokenStatsResponse> {
  const query = period ? `?period=${period}` : "";
  return api<TokenStatsResponse>(`/api/stats/tokens${query}`);
}

export async function fetchTokenTrend(range: string = "30d"): Promise<TokenTrendResponse> {
  return api<TokenTrendResponse>(`/api/stats/tokens/trend?range=${range}`);
}
