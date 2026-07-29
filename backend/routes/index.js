import { Router } from "express";
import multer from "multer";
import { attachUser, requireAuth } from "../middleware/auth.js";
import * as auth from "../controllers/authController.js";
import { runQuery } from "../controllers/queryController.js";
import { callRpc } from "../controllers/rpcController.js";
import * as storage from "../controllers/storageController.js";
import { models } from "../models/index.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export const router = Router();
router.use(attachUser);

/* ---------------- auth ---------------- */
router.post("/auth/login", auth.login);
router.post("/auth/register", auth.register);
router.get("/auth/session", auth.session);
router.post("/auth/logout", (_req, res) => res.json({ data: {} }));
router.post("/auth/password", requireAuth, auth.updatePassword);

/* ------------- generic data ------------- */
router.post("/query", requireAuth, runQuery);
router.post("/rpc", requireAuth, callRpc);

/* --------------- storage --------------- */
router.post("/storage/upload", requireAuth, upload.single("file"), (req, res, next) => {
  req.params0 = { bucket: req.body.bucket, path: req.body.path };
  storage.upload(req, res, next);
});
router.post("/storage/sign", requireAuth, storage.signedUrl);
router.post("/storage/remove", requireAuth, storage.removeObjects);
router.get("/storage/object/signed", storage.serveSigned);
router.get("/storage/public/*", storage.servePublic);

/* ---------- named REST endpoints ---------- */
const list = (table, sort) => async (req, res, next) => {
  try {
    let q = models[table].find({}).lean();
    if (sort) q = q.sort(sort);
    res.json({ data: await q.exec() });
  } catch (e) {
    next(e);
  }
};

router.get("/students/profile", requireAuth, async (req, res, next) => {
  try {
    const profile = await models.profiles.findOne({ user_id: req.user.id }).lean();
    res.json({ data: { ...req.user, profile } });
  } catch (e) {
    next(e);
  }
});
router.get("/faculty", requireAuth, list("faculty", { name: 1 }));
router.get("/timetable", requireAuth, list("timetable", { day: 1, slot: 1 }));
router.get("/announcements", requireAuth, list("announcements", { created_at: -1 }));
router.get("/events", requireAuth, list("events", { start_date: 1 }));
router.get("/subjects", requireAuth, list("subjects", { code: 1 }));

router.post("/attendance", requireAuth, async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [req.body];
    const saved = await models.attendance.insertMany(rows);
    res.json({ data: saved });
  } catch (e) {
    next(e);
  }
});

router.post("/messages/send", requireAuth, async (req, res, next) => {
  try {
    const msg = await models.chat_messages.create({
      ...req.body,
      sender_id: req.user.id,
    });
    const json = msg.toJSON();
    const { emitChange } = await import("../realtime.js");
    emitChange("chat_messages", "INSERT", json);
    res.json({ data: json });
  } catch (e) {
    next(e);
  }
});
