import { useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { UserAvatar } from "@/components/UserAvatar";
import { Card } from "@/components/ui/card";
import { Camera, Loader2, User, Mail, Hash, GraduationCap, Phone } from "lucide-react";

export const FacultyProfile = () => {
  const { profile, user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, canUpload } = useAvatarUpload();

  const fields = [
    { icon: User, label: "Full Name", value: profile?.full_name },
    { icon: Mail, label: "Email", value: profile?.email ?? user?.email },
    { icon: Hash, label: "Employee ID", value: profile?.employee_id ?? "—" },
    { icon: GraduationCap, label: "Department", value: profile?.branch ?? "—" },
    { icon: Phone, label: "Phone", value: profile?.phone ?? "—" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">My Profile</h1>
        <p className="text-muted-foreground text-sm">Your personal information.</p>
      </div>
      <Card className="glass-card p-6 flex items-center gap-5 flex-wrap">
        <div className="relative">
          <UserAvatar name={profile?.full_name} src={profile?.avatar_url} className="w-24 h-24 text-3xl shadow-glow" />
          {canUpload && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Upload profile photo"
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-glow hover:scale-110 transition-transform disabled:opacity-60"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; upload(f); }} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{profile?.full_name}</h2>
          <p className="text-sm text-muted-foreground">
            {canUpload ? "Apni profile photo lagayein" : "Photo badalne ke liye Admin se sampark karein"}
          </p>
        </div>
      </Card>
      <div className="grid sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <Card key={f.label} className="glass-card p-4 flex items-center gap-3">
            <f.icon className="w-5 h-5 text-primary" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</div>
              <div className="font-semibold truncate">{f.value}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
