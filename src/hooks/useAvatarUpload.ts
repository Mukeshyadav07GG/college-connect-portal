import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/** Self-service photo upload. Allowed only when the user has no photo yet; only admins change/remove. */
export const useAvatarUpload = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const canUpload = !profile?.avatar_url;

  const upload = async (f: File | undefined) => {
    if (!f || !user) return;
    if (!canUpload) return toast.error("Photo badalne ke liye Admin se sampark karein");
    if (!f.type.startsWith("image/")) return toast.error("Sirf image file select karein");
    if (f.size > 2 * 1024 * 1024) return toast.error("Photo 2MB se chhoti honi chahiye");
    setUploading(true);
    try {
      const ext = f.name.split(".").pop() ?? "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, f, { contentType: f.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile photo lag gaya 👍");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, canUpload };
};
