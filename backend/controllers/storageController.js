import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { HttpError } from "../middleware/error.js";
import { signToken, verifyToken } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "uploads");

export const PUBLIC_BUCKETS = new Set(["avatars", "hostel-images"]);

const safe = (bucket, objectPath) => {
  const target = path.normalize(path.join(ROOT, bucket, objectPath));
  if (!target.startsWith(path.join(ROOT, bucket)))
    throw new HttpError(400, "Invalid path", "400");
  return target;
};

export const upload = async (req, res, next) => {
  try {
    const { bucket, path: objectPath } = req.params0 || req.body;
    const file = req.file;
    if (!file) throw new HttpError(400, "No file uploaded", "400");
    const target = safe(bucket, objectPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (fs.existsSync(target) && req.body.upsert !== "true")
      throw new HttpError(409, "The resource already exists", "409");
    fs.writeFileSync(target, file.buffer);
    res.json({ data: { path: objectPath, bucket } });
  } catch (err) {
    next(err);
  }
};

export const publicUrl = (bucket, objectPath) =>
  `${process.env.PUBLIC_URL || ""}/api/storage/public/${bucket}/${objectPath}`;

export const signedUrl = async (req, res, next) => {
  try {
    const { bucket, path: objectPath, expiresIn = 300, download } = req.body;
    const token = signToken(
      { bucket, path: objectPath, download: download || null },
      `${Math.max(1, Number(expiresIn))}s`
    );
    res.json({
      data: {
        signedUrl: `${process.env.PUBLIC_URL || ""}/api/storage/object/signed?token=${token}`,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const serveSigned = async (req, res, next) => {
  try {
    const payload = verifyToken(String(req.query.token || ""));
    if (!payload) throw new HttpError(401, "Invalid or expired link", "401");
    const target = safe(payload.bucket, payload.path);
    if (!fs.existsSync(target)) throw new HttpError(404, "Object not found", "404");
    if (payload.download)
      res.setHeader("Content-Disposition", `attachment; filename="${payload.download}"`);
    res.sendFile(target);
  } catch (err) {
    next(err);
  }
};

export const servePublic = async (req, res, next) => {
  try {
    const [bucket, ...rest] = req.params[0].split("/");
    if (!PUBLIC_BUCKETS.has(bucket)) throw new HttpError(403, "Bucket is private", "403");
    const target = safe(bucket, rest.join("/"));
    if (!fs.existsSync(target)) throw new HttpError(404, "Object not found", "404");
    res.sendFile(target);
  } catch (err) {
    next(err);
  }
};

export const removeObjects = async (req, res, next) => {
  try {
    const { bucket, paths = [] } = req.body;
    for (const p of paths) {
      const target = safe(bucket, p);
      if (fs.existsSync(target)) fs.unlinkSync(target);
    }
    res.json({ data: paths.map((p) => ({ name: p })) });
  } catch (err) {
    next(err);
  }
};
