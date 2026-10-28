import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * student-docs files are private, so we never persist long-lived signed URLs.
 * Rows store the storage path (new rows) or a legacy signed URL (old rows);
 * a fresh 60-second link is minted only when the user opens/downloads the file.
 */
const BUCKET = "student-docs";

function extractPath(fileUrl: string): string {
  if (!/^https?:\/\//i.test(fileUrl)) return fileUrl;
  const marker = `/object/sign/${BUCKET}/`;
  const i = fileUrl.indexOf(marker);
  if (i < 0) return "";
  const raw = fileUrl.slice(i + marker.length).split("?")[0];
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function signedUrlFor(fileUrl: string): Promise<string | null> {
  const path = extractPath(fileUrl);
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    toast.error("Could not open the document. Please try again.");
    return null;
  }
  return data.signedUrl;
}

export async function viewStudentDoc(fileUrl: string) {
  const url = await signedUrlFor(fileUrl);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

export async function downloadStudentDoc(fileUrl: string) {
  const url = await signedUrlFor(fileUrl);
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = "";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
