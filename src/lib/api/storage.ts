import { requestRaw } from "./http";
import { API_URL } from "./config";

/** Storage facade backed by the Express + S3 endpoints. */
const bucketApi = (bucket: string) => ({
  async upload(path: string, file: Blob | File, options?: { contentType?: string; upsert?: boolean }) {
    const contentType = options?.contentType || (file as File).type || "application/octet-stream";
    const { payload, error } = await requestRaw<any>("/api/storage/sign-upload", {
      method: "POST",
      body: { bucket, path, contentType },
    });
    if (error || !payload) return { data: null, error };
    try {
      const res = await fetch(payload.url, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!res.ok) return { data: null, error: { message: `Upload failed (${res.status})` } };
      return { data: { path }, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err?.message || "Upload failed" } };
    }
  },

  async createSignedUrl(path: string, expiresIn: number, options?: { download?: string | boolean }) {
    const download = typeof options?.download === "string" ? options.download : undefined;
    const { payload, error } = await requestRaw<any>("/api/storage/sign-download", {
      method: "POST",
      body: { bucket, path, expiresIn, download },
    });
    if (error || !payload) return { data: null, error };
    return { data: { signedUrl: payload.url }, error: null };
  },

  async download(path: string) {
    const { data, error } = await this.createSignedUrl(path, 300);
    if (error || !data) return { data: null, error };
    try {
      const res = await fetch(data.signedUrl);
      if (!res.ok) return { data: null, error: { message: `Download failed (${res.status})` } };
      return { data: await res.blob(), error: null };
    } catch (err: any) {
      return { data: null, error: { message: err?.message || "Download failed" } };
    }
  },

  getPublicUrl(path: string) {
    return { data: { publicUrl: `${API_URL}/api/storage/public/${bucket}/${path}` } };
  },

  async remove(paths: string[]) {
    const { error } = await requestRaw("/api/storage/objects", {
      method: "DELETE",
      body: { bucket, paths },
    });
    return { data: error ? null : paths, error };
  },
});

export const storage = { from: bucketApi };
