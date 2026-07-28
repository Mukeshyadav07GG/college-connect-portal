require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { connectDB } = require("./config/db");
const { attachUser } = require("./middleware/auth");
const { notFound, errorHandler } = require("./middleware/error");
const { initRealtime } = require("./realtime");

const authRoutes = require("./routes/authRoutes");
const dataRoutes = require("./routes/dataRoutes");
const storageRoutes = require("./routes/storageRoutes");
const apiRoutes = require("./routes/apiRoutes");

const PORT = Number(process.env.PORT) || 5000;
const ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:8080,http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();

app.use(cors({ origin: ORIGINS.includes("*") ? true : ORIGINS, credentials: true }));
app.use(express.json({ limit: "25mb" }));
app.use(morgan("dev"));
app.use(attachUser);

app.get("/api/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.use("/api/auth", authRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api", dataRoutes); // /api/query and /api/rpc/:name
app.use("/api", apiRoutes); // REST resource endpoints

app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
initRealtime(server, ORIGINS.includes("*") ? true : ORIGINS);

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`[server] API listening on http://localhost:${PORT}`);
    console.log(`[server] Socket.io ready, allowed origins: ${ORIGINS.join(", ")}`);
  });
});

module.exports = { app, server };
