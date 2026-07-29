let io = null;

export const setIO = (instance) => {
  io = instance;
};

/** Broadcasts a change in the same shape the frontend realtime layer expects. */
export const emitChange = (table, eventType, record, old = null) => {
  if (!io) return;
  io.emit("db_change", {
    table,
    eventType, // INSERT | UPDATE | DELETE
    new: record ?? {},
    old: old ?? {},
  });
};

export const initRealtime = (server, origin) => {
  return import("socket.io").then(({ Server }) => {
    const instance = new Server(server, { cors: { origin: origin || "*" } });
    instance.on("connection", (socket) => {
      socket.on("disconnect", () => {});
    });
    setIO(instance);
    return instance;
  });
};
