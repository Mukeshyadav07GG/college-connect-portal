/**
 * REST client for the Node/Express + MongoDB backend.
 *
 * It exposes the exact same surface the UI already uses (`from().select()`,
 * `rpc()`, `storage.from()`, `auth`, `channel()`), so no component code has to
 * change — only the import path.
 *
 * Point it at your API with VITE_API_URL (see .env).
 */
import { io, type Socket } from "socket.io-client";

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

const STORAGE_KEY = "knmiet-auth-session";

export interface ApiError {
  message: string;
  code?: string;
}
export interface ApiResult<T = any> {
  data: T;
  error: ApiError | null;
  count?: number | null;
}

/* ------------------------------------------------------------------ session */

export interface User {
  id: string;
  email: string;
  user_metadata: Record<string, any>;
  role?: string;
}
export interface Session {
  access_token: string;
  token_type?: string;
  expires_at: number;
  user: User;
}
type MaybeSession = Session | null;

let currentSession: MaybeSession = null;
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) currentSession = JSON.parse(raw);
} catch {
  currentSession = null;
}

type AuthListener = (event: string, session: MaybeSession) => void;
const authListeners = new Set<AuthListener>();

const setSession = (session: MaybeSession, event: string) => {
  currentSession = session;
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
  authListeners.forEach((cb) => cb(event, session));
};

/* ------------------------------------------------------------------ fetch */

const request = async <T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> => {
  try {
    const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
    if (!(init.body instanceof FormData)) headers["Content-Type"] = "application/json";
    if (currentSession?.access_token)
      headers.Authorization = `Bearer ${currentSession.access_token}`;

    const res = await fetch(`${API_URL}${path}`, { ...init, headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && currentSession) setSession(null, "SIGNED_OUT");
      return { data: null as T, error: json.error || { message: res.statusText, code: String(res.status) } };
    }
    return { data: json.data as T, error: null, count: json.count ?? null };
  } catch (e: any) {
    return { data: null as T, error: { message: e?.message || "Network error", code: "network" } };
  }
};

/* ------------------------------------------------------------- query builder */

type Filter = { column: string; op: string; value: any };

class QueryBuilder<T = any> implements PromiseLike<ApiResult<T>> {
  private table: string;
  private action = "select";
  private columns: string | undefined;
  private filters: Filter[] = [];
  private orders: { column: string; ascending: boolean }[] = [];
  private _limit?: number;
  private _range?: [number, number];
  private _values?: any;
  private _single?: "one" | "maybe";
  private _onConflict?: string;
  private _count?: boolean;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = "*", opts?: { count?: string; head?: boolean }) {
    if (this.action === "select") this.columns = columns;
    this._count = !!opts?.count;
    return this;
  }
  insert(values: any) {
    this.action = "insert";
    this._values = values;
    return this;
  }
  upsert(values: any, opts?: { onConflict?: string }) {
    this.action = "upsert";
    this._values = values;
    this._onConflict = opts?.onConflict;
    return this;
  }
  update(values: any) {
    this.action = "update";
    this._values = values;
    return this;
  }
  delete() {
    this.action = "delete";
    return this;
  }

  private add(column: string, op: string, value: any) {
    this.filters.push({ column, op, value });
    return this;
  }
  eq(c: string, v: any) { return this.add(c, "eq", v); }
  neq(c: string, v: any) { return this.add(c, "neq", v); }
  gt(c: string, v: any) { return this.add(c, "gt", v); }
  gte(c: string, v: any) { return this.add(c, "gte", v); }
  lt(c: string, v: any) { return this.add(c, "lt", v); }
  lte(c: string, v: any) { return this.add(c, "lte", v); }
  in(c: string, v: any[]) { return this.add(c, "in", v); }
  like(c: string, v: string) { return this.add(c, "like", v); }
  ilike(c: string, v: string) { return this.add(c, "ilike", v); }
  is(c: string, v: any) { return this.add(c, "is", v); }
  not(c: string, _op: string, v: any) { return this.add(c, "not", v); }
  contains(c: string, v: any) { return this.add(c, "in", v); }

  /** Supports the PostgREST string form: "a.eq.1,b.eq.2" */
  or(expression: string) {
    const parts = expression.split(",").map((chunk) => {
      const [column, op, ...rest] = chunk.split(".");
      return { column, op, value: rest.join(".") };
    });
    this.filters.push({ column: "$or", op: "or", value: parts });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orders.push({ column, ascending: opts?.ascending !== false });
    return this;
  }
  limit(n: number) { this._limit = n; return this; }
  range(from: number, to: number) { this._range = [from, to]; return this; }
  single() { this._single = "one"; return this; }
  maybeSingle() { this._single = "maybe"; return this; }

  then<TResult1 = ApiResult<T>, TResult2 = never>(
    onfulfilled?: ((value: ApiResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return request<T>("/api/query", {
      method: "POST",
      body: JSON.stringify({
        table: this.table,
        action: this.action,
        columns: this.columns,
        filters: this.filters,
        order: this.orders,
        limit: this._limit,
        range: this._range,
        values: this._values,
        single: this._single,
        onConflict: this._onConflict,
        count: this._count,
      }),
    }).then(onfulfilled as any, onrejected as any);
  }
}

/* ---------------------------------------------------------------- storage */

const storageBucket = (bucket: string) => ({
  async upload(path: string, file: Blob | File, opts?: { upsert?: boolean; contentType?: string }) {
    const form = new FormData();
    form.append("bucket", bucket);
    form.append("path", path);
    form.append("upsert", String(!!opts?.upsert));
    form.append("file", file, (file as File).name || path.split("/").pop() || "file");
    return request<{ path: string }>("/api/storage/upload", { method: "POST", body: form });
  },
  getPublicUrl(path: string) {
    return { data: { publicUrl: `${API_URL}/api/storage/public/${bucket}/${path}` } };
  },
  async createSignedUrl(path: string, expiresIn: number, opts?: { download?: string | boolean }) {
    return request<{ signedUrl: string }>("/api/storage/sign", {
      method: "POST",
      body: JSON.stringify({ bucket, path, expiresIn, download: opts?.download ?? null }),
    });
  },
  async download(path: string) {
    const signed = await this.createSignedUrl(path, 60);
    if (signed.error || !signed.data?.signedUrl) return { data: null, error: signed.error };
    const res = await fetch(signed.data.signedUrl);
    if (!res.ok) return { data: null, error: { message: "Download failed" } };
    return { data: await res.blob(), error: null };
  },
  async remove(paths: string[]) {
    return request("/api/storage/remove", {
      method: "POST",
      body: JSON.stringify({ bucket, paths }),
    });
  },
});

/* --------------------------------------------------------------- realtime */

let socket: Socket | null = null;
const getSocket = () => {
  if (!socket) socket = io(API_URL, { transports: ["websocket", "polling"] });
  return socket;
};

type ChangeHandler = (payload: any) => void;

class RealtimeChannel {
  name: string;
  private handlers: { table?: string; event?: string; filter?: string; cb: ChangeHandler }[] = [];
  private listener?: (payload: any) => void;

  constructor(name: string) {
    this.name = name;
  }

  on(_type: string, config: any, cb: ChangeHandler) {
    this.handlers.push({ table: config?.table, event: config?.event, filter: config?.filter, cb });
    return this;
  }

  subscribe(cb?: (status: string) => void) {
    this.listener = (payload: any) => {
      for (const h of this.handlers) {
        if (h.table && h.table !== payload.table) continue;
        if (h.event && h.event !== "*" && h.event !== payload.eventType) continue;
        if (h.filter) {
          const [col, , value] = h.filter.split(/[.=]/).filter(Boolean);
          const row = payload.new ?? payload.old ?? {};
          if (String(row[col]) !== String(value)) continue;
        }
        h.cb(payload);
      }
    };
    getSocket().on("db_change", this.listener);
    cb?.("SUBSCRIBED");
    return this;
  }

  unsubscribe() {
    if (this.listener) socket?.off("db_change", this.listener);
    this.listener = undefined;
    return this;
  }
}

/* ------------------------------------------------------------------ client */

export const supabase = {
  from: <T = any>(table: string) => new QueryBuilder<T>(table),

  rpc: async <T = any>(fn: string, args: Record<string, any> = {}) =>
    request<T>("/api/rpc", { method: "POST", body: JSON.stringify({ fn, args }) }),

  storage: { from: storageBucket },

  channel: (name: string) => new RealtimeChannel(name),
  removeChannel: (channel: RealtimeChannel) => channel?.unsubscribe?.(),

  auth: {
    async getSession() {
      if (!currentSession) return { data: { session: null }, error: null };
      const res = await request<{ session: MaybeSession }>("/api/auth/session");
      if (res.error || !res.data?.session) {
        setSession(null, "SIGNED_OUT");
        return { data: { session: null }, error: null };
      }
      setSession(res.data.session, "TOKEN_REFRESHED");
      return { data: { session: res.data.session }, error: null };
    },

    async getUser() {
      const { data } = await this.getSession();
      return { data: { user: data.session?.user ?? null }, error: null };
    },

    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const res = await request<{ session: MaybeSession }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (res.error) return { data: { session: null, user: null }, error: res.error };
      setSession(res.data.session, "SIGNED_IN");
      return {
        data: { session: res.data.session, user: res.data.session?.user ?? null },
        error: null,
      };
    },

    async signUp({ email, password, options }: { email: string; password: string; options?: any }) {
      const res = await request<{ session: MaybeSession }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, options }),
      });
      if (res.error) return { data: { session: null, user: null }, error: res.error };
      setSession(res.data.session, "SIGNED_IN");
      return {
        data: { session: res.data.session, user: res.data.session?.user ?? null },
        error: null,
      };
    },

    async signOut() {
      await request("/api/auth/logout", { method: "POST" });
      setSession(null, "SIGNED_OUT");
      return { error: null };
    },

    async updateUser(attrs: { password?: string; data?: Record<string, any> }) {
      if (attrs.password) {
        const res = await request("/api/auth/password", {
          method: "POST",
          body: JSON.stringify({ password: attrs.password }),
        });
        return { data: { user: currentSession?.user ?? null }, error: res.error };
      }
      return { data: { user: currentSession?.user ?? null }, error: null };
    },

    onAuthStateChange(cb: AuthListener) {
      authListeners.add(cb);
      // mirror the async initial emit the UI expects
      setTimeout(() => cb(currentSession ? "INITIAL_SESSION" : "SIGNED_OUT", currentSession), 0);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(cb);
            },
          },
        },
      };
    },
  },

  functions: {
    invoke: async <T = any>(name: string, opts?: { body?: any }) =>
      request<T>(`/api/${name}`, { method: "POST", body: JSON.stringify(opts?.body ?? {}) }),
  },
};

export default supabase;
