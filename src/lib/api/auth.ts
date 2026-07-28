import { requestRaw, setToken, getToken } from "./http";
import { USER_KEY } from "./config";

type Listener = (event: string, session: any) => void;
const listeners = new Set<Listener>();

const readUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeUser = (user: any) => {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
};

const sessionFrom = (user: any) => {
  const token = getToken();
  return user && token ? { access_token: token, user } : null;
};

const emit = (event: string) => {
  const session = sessionFrom(readUser());
  listeners.forEach((listener) => listener(event, session));
};

export const auth = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const { payload, error } = await requestRaw<any>("/api/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    if (error || !payload) return { data: { user: null, session: null }, error };
    setToken(payload.token);
    writeUser(payload.user);
    emit("SIGNED_IN");
    return { data: { user: payload.user, session: sessionFrom(payload.user) }, error: null };
  },

  async signUp({ email, password, options }: { email: string; password: string; options?: any }) {
    const { payload, error } = await requestRaw<any>("/api/auth/register", {
      method: "POST",
      body: { email, password, metadata: options?.data ?? {} },
      auth: false,
    });
    if (error || !payload) return { data: { user: null, session: null }, error };
    setToken(payload.token);
    writeUser(payload.user);
    emit("SIGNED_IN");
    return { data: { user: payload.user, session: sessionFrom(payload.user) }, error: null };
  },

  async signOut() {
    await requestRaw("/api/auth/logout", { method: "POST" });
    setToken(null);
    writeUser(null);
    emit("SIGNED_OUT");
    return { error: null };
  },

  async getSession() {
    return { data: { session: sessionFrom(readUser()) }, error: null };
  },

  async getUser() {
    const { payload, error } = await requestRaw<any>("/api/auth/session");
    if (error || !payload?.user) {
      setToken(null);
      writeUser(null);
      return { data: { user: null }, error };
    }
    writeUser(payload.user);
    return { data: { user: payload.user }, error: null };
  },

  async updateUser(attributes: { password?: string; data?: Record<string, any> }) {
    const { payload, error } = await requestRaw<any>("/api/auth/user", {
      method: "PATCH",
      body: attributes,
    });
    if (error) return { data: { user: null }, error };
    if (payload?.user) writeUser(payload.user);
    return { data: { user: payload?.user ?? null }, error: null };
  },

  onAuthStateChange(callback: Listener) {
    listeners.add(callback);
    // Emit the current state asynchronously, matching the previous client.
    setTimeout(() => callback(getToken() ? "INITIAL_SESSION" : "SIGNED_OUT", sessionFrom(readUser())), 0);
    return {
      data: {
        subscription: {
          unsubscribe: () => listeners.delete(callback),
        },
      },
    };
  },
};
