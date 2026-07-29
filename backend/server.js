import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import { router } from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { initRealtime } from "./realtime.js";

const app = express();
const origin = process.env.CLIENT_ORIGIN || "*";

app.use(cors({ origin, credentials: false }));
app.use(express.json({ limit: "25mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api", router);
app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
const port = Number(process.env.PORT || 5000);

connectDB()
  .then(() => initRealtime(server, origin))
  .then(() => {
    server.listen(port, () => console.log(`[server] listening on http://localhost:${port}`));
  })
  .catch((err) => {
    console.error("[server] failed to start:", err.message);
    process.exit(1);
  });
