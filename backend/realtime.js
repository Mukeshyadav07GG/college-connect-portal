const { Server } = require("socket.io");

let io = null;

function initRealtime(httpServer, corsOrigins) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId;
    if (userId) socket.join(`user:${userId}`);

    socket.on("join", (room) => socket.join(String(room)));
    socket.on("leave", (room) => socket.leave(String(room)));
    socket.on("disconnect", () => {});
  });

  return io;
}

/**
 * Broadcasts a data change so the frontend realtime client can react,
 * mirroring the old postgres_changes payload shape.
 */
function emitChange(table, eventType, rows) {
  if (!io) return;
  const list = Array.isArray(rows) ? rows : [rows];
  list.filter(Boolean).forEach((row) => {
    const payload = {
      table,
      eventType,
      new: eventType === "DELETE" ? {} : row,
      old: eventType === "DELETE" ? row : {},
    };
    io.emit("db_change", payload);

    // Direct fan-out for chat so recipients get an instant push.
    if (table === "chat_messages" && row.recipient_id) {
      io.to(`user:${row.recipient_id}`).emit("db_change", payload);
      io.to(`user:${row.sender_id}`).emit("db_change", payload);
    }
  });
}

const getIO = () => io;

module.exports = { initRealtime, emitChange, getIO };
