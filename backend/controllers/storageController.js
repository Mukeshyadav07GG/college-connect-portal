const { signUpload, signDownload, publicBase, isPublicPrefix, keyFor, removeObjects } = require("../config/s3");
const { asyncHandler, HttpError } = require("../middleware/error");

const BUCKETS = new Set([
  "avatars",
  "hostel-images",
  "assignments",
  "submissions",
  "student-docs",
  "subject-notes",
  "syllabus-problems",
]);

const assertBucket = (bucket) => {
  if (!BUCKETS.has(bucket)) throw new HttpError(400, `Unknown bucket "${bucket}"`);
};

/** POST /api/storage/sign-upload */
const createUploadUrl = asyncHandler(async (req, res) => {
  const { bucket, path, contentType } = req.body || {};
  assertBucket(bucket);
  if (!path) throw new HttpError(400, "path is required");

  const url = await signUpload(bucket, path, contentType);
  res.json({
    url,
    method: "PUT",
    key: keyFor(bucket, path),
    publicUrl: isPublicPrefix(bucket) ? `${publicBase()}/${keyFor(bucket, path)}` : null,
  });
});

/** POST /api/storage/sign-download */
const createDownloadUrl = asyncHandler(async (req, res) => {
  const { bucket, path, expiresIn } = req.body || {};
  assertBucket(bucket);
  if (!path) throw new HttpError(400, "path is required");
  const url = await signDownload(bucket, path, Number(expiresIn) || 3600);
  res.json({ signedUrl: url });
});

/** GET /api/storage/public/:bucket/* - stable URL that redirects to the object. */
const redirectToObject = asyncHandler(async (req, res) => {
  const { bucket } = req.params;
  const path = req.params[0];
  assertBucket(bucket);
  if (isPublicPrefix(bucket)) {
    return res.redirect(`${publicBase()}/${keyFor(bucket, path)}`);
  }
  const url = await signDownload(bucket, path, 3600);
  res.redirect(url);
});

/** DELETE /api/storage/objects */
const removeFiles = asyncHandler(async (req, res) => {
  const { bucket, paths } = req.body || {};
  assertBucket(bucket);
  await removeObjects(bucket, Array.isArray(paths) ? paths : [paths]);
  res.json({ data: paths, error: null });
});

module.exports = { createUploadUrl, createDownloadUrl, redirectToObject, removeFiles, BUCKETS };
