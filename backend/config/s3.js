const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const REGION = process.env.AWS_REGION || "ap-south-1";
const BUCKET = process.env.S3_BUCKET;

const s3 = new S3Client({
  region: REGION,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

/** Buckets from the old stack become key prefixes inside one S3 bucket. */
const PUBLIC_PREFIXES = new Set(["avatars", "hostel-images"]);

const keyFor = (prefix, path) => `${prefix}/${String(path).replace(/^\/+/, "")}`;

const publicBase = () =>
  process.env.S3_PUBLIC_BASE || `https://${BUCKET}.s3.${REGION}.amazonaws.com`;

const isPublicPrefix = (prefix) => PUBLIC_PREFIXES.has(prefix);

async function signUpload(prefix, path, contentType) {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: keyFor(prefix, path),
    ContentType: contentType || "application/octet-stream",
    ...(isPublicPrefix(prefix) ? { ACL: "public-read" } : {}),
  });
  return getSignedUrl(s3, cmd, { expiresIn: 900 });
}

async function signDownload(prefix, path, expiresIn = 3600, downloadName) {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: keyFor(prefix, path),
    ...(downloadName
      ? { ResponseContentDisposition: `attachment; filename="${downloadName}"` }
      : {}),
  });
  return getSignedUrl(s3, cmd, { expiresIn });
}

async function removeObjects(prefix, paths) {
  await Promise.all(
    paths.map((p) =>
      s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: keyFor(prefix, p) })),
    ),
  );
}

module.exports = {
  s3,
  BUCKET,
  keyFor,
  publicBase,
  isPublicPrefix,
  signUpload,
  signDownload,
  removeObjects,
};
