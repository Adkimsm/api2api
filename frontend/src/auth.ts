const TOKEN_KEY = "api2api.adminToken";

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(value: string): void {
  localStorage.setItem(TOKEN_KEY, value);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export const UNAUTH_EVENT = "api2api:unauth";
