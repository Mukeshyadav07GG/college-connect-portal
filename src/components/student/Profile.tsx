import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Mail, Phone, Hash, BookOpen, GraduationCap, MapPin, ClipboardCheck, Award, Wallet, ArrowRight, Camera, Trash2, Loader2, CalendarDays, CalendarClock } from "lucide-react";

export const Profile = () => {
  const { profile, user, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onPick = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !user) return;
    if (!f.type.startsWith("image/")) return toast.error("Sirf image file select karein");
    if (f.size > 2 * 1024 * 1024) return toast.error("Photo 2MB se chhoti honi chahiye");
    setUploading(true);
    try {
      const ext = f.name.split(".").pop() ?? "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, f, { contentType: f.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("user_id", user.id);
      if (updErr) throw updErr;
      await refreshProfile();
      toast.success("Profile photo update ho gaya 👍");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (!user) return;
    setUploading(true);
    try {
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Photo hata diya gaya");
    } catch (err: any) {
      toast.error(err?.message ?? "Remove failed");
    } finally {
      setUploading(false);
    }
  };

  const fields = [
    { icon: User, label: "Full Name", value: profile?.full_name },
    { icon: Mail, label: "Email", value: profile?.email ?? user?.email },
    { icon: Hash, label: "Roll Number", value: profile?.roll_number ?? "—" },
    { icon: GraduationCap, label: "Branch", value: profile?.branch ?? "—" },
    { icon: BookOpen, label: "Semester", value: profile?.semester ?? "—" },
    { icon: MapPin, label: "Section", value: profile?.section ?? "—" },
    { icon: CalendarDays, label: "Session", value: profile?.session ?? "—" },
    { icon: CalendarClock, label: "Active Session", value: profile?.active_session ?? "—" },
    { icon: Phone, label: "Phone", value: profile?.phone ?? "—" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">My Profile</h1>
        <p className="text-muted-foreground text-sm">Your academic and personal information.</p>
      </div>

      {/* Header card */}
      <div className="glass rounded-3xl overflow-hidden">
        <div className="bg-gradient-hero h-32 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="relative group">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name ?? "Profile"}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-background shadow-glow-strong"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl gradient-bg flex items-center justify-center text-primary-foreground text-3xl font-bold border-4 border-background shadow-glow-strong">
                  {(profile?.full_name ?? "S").charAt(0).toUpperCase()}
                </div>
              )}
              <button
                onClick={onPick}
                disabled={uploading}
                aria-label="Upload profile photo"
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-glow hover:scale-110 transition-transform disabled:opacity-60"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              {profile?.avatar_url && (
                <button
                  onClick={removePhoto}
                  disabled={uploading}
                  aria-label="Remove profile photo"
                  className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow hover:scale-110 transition-transform disabled:opacity-60"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            </div>
          </div>
        </div>
        <div className="pt-16 pb-6 px-8">
          <h2 className="font-display text-2xl font-bold">{profile?.full_name}</h2>
          <p className="text-sm text-muted-foreground">
            {profile?.branch} · Sem {profile?.semester} · Section {profile?.section}
            {profile?.active_session ? ` · ${profile.active_session}` : ""}
          </p>
        </div>
      </div>

      {/* Quick access */}
      <div className="grid sm:grid-cols-3 gap-4">

        {[
          { to: "/student/attendance", label: "Attendance", desc: "View class-wise attendance", icon: ClipboardCheck, color: "from-blue-500 to-cyan-500" },
          { to: "/student/result", label: "Result", desc: "Semester results & marks", icon: Award, color: "from-amber-500 to-orange-500" },
          { to: "/student/fees", label: "Fees", desc: "Pay & download receipts", icon: Wallet, color: "from-emerald-500 to-teal-500" },
        ].map((q, i) => (
          <Link
            key={q.label}
            to={q.to}
            className="glass rounded-2xl p-5 hover-lift animate-slide-up group flex items-center gap-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${q.color} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
              <q.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold">{q.label}</div>
              <div className="text-xs text-muted-foreground truncate">{q.desc}</div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition" />
          </Link>
        ))}
      </div>


      {/* Detail grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {fields.map((f, i) => (
          <div key={f.label} className="glass rounded-2xl p-5 hover-lift animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</div>
                <div className="font-medium text-sm mt-0.5 break-words">{f.value || "—"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
