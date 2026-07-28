import { API_URL, TOKEN_KEY } from "./config";

export interface ApiResult<T = any> {
  data: T;
  error: { message: string } | null;
  count?: number;
}

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
};

/** Thin fetch wrapper that always resolves to { data, error }. */
export async function request<T = any>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<ApiResult<T>> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok) {
      return {
        data: null as unknown as T,
        error: { message: payload.message || `Request failed (${response.status})` },
      };
    }
    return { data: payload.data as T, error: null, count: payload.count };
  } catch (err: any) {
    return {
      data: null as unknown as T,
      error: { message: err?.message || "Network error - is the API server running?" },
    };
  }
}

/** Raw variant that returns the whole JSON body (used by auth/storage). */
export async function requestRaw<T = any>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<{ payload: T | null; error: { message: string } | null }> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
      return { payload: null, error: { message: payload.message || `Request failed (${response.status})` } };
    }
    return { payload: payload as T, error: null };
  } catch (err: any) {
    return { payload: null, error: { message: err?.message || "Network error" } };
  }
}
