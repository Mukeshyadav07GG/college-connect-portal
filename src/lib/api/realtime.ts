import { io, Socket } from "socket.io-client";
import { API_URL } from "./config";
import { getToken } from "./http";

let socket: Socket | null = null;

const getSocket = () => {
  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket", "polling"],
      auth: () => ({ token: getToken() }),
      autoConnect: true,
    });
  }
  return socket;
};

type Handler = (payload: any) => void;

interface Binding {
  table: string;
  event: string;
  filterColumn?: string;
  filterValue?: string;
  handler: Handler;
}

/** Socket.io channel with the same shape the components already use. */
class Channel {
  readonly name: string;
  private bindings: Binding[] = [];
  private listener: ((message: any) => void) | null = null;

  constructor(name: string) {
    this.name = name;
  }

  on(_type: string, options: { event?: string; table?: string; filter?: string }, handler: Handler) {
    let filterColumn: string | undefined;
    let filterValue: string | undefined;
    if (options.filter) {
      const [column, rest] = options.filter.split("=eq.");
      filterColumn = column;
      filterValue = rest;
    }
    this.bindings.push({
      table: options.table || "",
      event: (options.event || "*").toUpperCase(),
      filterColumn,
      filterValue,
      handler,
    });
    return this;
  }

  subscribe(callback?: (status: string) => void) {
    const s = getSocket();
    this.listener = (message: any) => {
      const row = message?.new ?? message?.old ?? {};
      this.bindings.forEach((binding) => {
        if (binding.table && binding.table !== message.table) return;
        if (binding.event !== "*" && binding.event !== message.eventType) return;
        if (binding.filterColumn && String(row[binding.filterColumn]) !== binding.filterValue) return;
        binding.handler(message);
      });
    };
    s.on("db_change", this.listener);
    callback?.("SUBSCRIBED");
    return this;
  }

  unsubscribe() {
    if (this.listener && socket) socket.off("db_change", this.listener);
    this.listener = null;
  }
}

export const channel = (name: string) => new Channel(name);
export const removeChannel = (ch: any) => ch?.unsubscribe?.();
