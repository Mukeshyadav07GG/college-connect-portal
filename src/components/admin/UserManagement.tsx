import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Search, Camera, Trash2, Pencil } from "lucide-react";
import { AddUserDialog } from "./AddUserDialog";
import { EditUserDialog } from "./EditUserDialog";
import { SEMESTERS, semLabel } from "@/lib/semesters";

type Role = "student" | "faculty" | "admin";

interface UserRow {
  user_id: string;
  full_name: string;
  email: string | null;
  roll_number: string | null;
  employee_id: string | null;
  branch: string | null;
  semester: string | null;
  section: string | null;
  phone: string | null;
  role: Role | null;
  avatar_url?: string | null;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filter, setFilter] = useState<"all" | Role>("all");
  const [semF, setSemF] = useState("all");
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [photoUser, setPhotoUser] = useState<UserRow | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email, roll_number, employee_id, branch, semester, section, phone, avatar_url"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap = new Map<string, Role>();
    (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));
    const merged: UserRow[] = (profs ?? []).map((p: any) => ({
      ...p,
      role: roleMap.get(p.user_id) ?? null,
    }));
    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (userId: string, newRole: Role) => {
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) { toast.error(delErr.message); return; }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) toast.error(error.message);
    else { toast.success("Role updated"); load(); }
  };

  const openPhoto = (u: UserRow) => {
    setPhotoUser(u);
    setFile(null);
    setPreview(u.avatar_url ?? null);
  };

  const onFileChange = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Image files only"); return; }
    if (f.size > 2 * 1024 * 1024) { toast.error("Max 2MB"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const uploadPhoto = async () => {
    if (!photoUser || !file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${photoUser.user_id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("user_id", photoUser.user_id);
      if (updErr) throw updErr;
      toast.success("Profile picture updated");
      setPhotoUser(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const removePhoto = async () => {
    if (!photoUser) return;
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", photoUser.user_id);
    if (error) toast.error(error.message);
    else { toast.success("Removed"); setPhotoUser(null); load(); }
  };

  const filtered = users.filter((u) => {
    if (filter !== "all" && u.role !== filter) return false;
    if (semF !== "all" && u.semester !== semF) return false;
    if (q && !`${u.full_name} ${u.email} ${u.roll_number} ${u.employee_id}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: users.length,
    student: users.filter((u) => u.role === "student").length,
    faculty: users.filter((u) => u.role === "faculty").length,
    admin: users.filter((u) => u.role === "admin").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Users className="h-7 w-7" /> User Management</h1>
          <p className="text-muted-foreground">Add users, view all users and change their roles</p>
        </div>
        <AddUserDialog onCreated={load} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["all", "student", "faculty", "admin"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`glass-card p-4 rounded-xl text-left transition ${filter === k ? "ring-2 ring-primary" : ""}`}
          >
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
            <div className="text-2xl font-bold">{counts[k]}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, roll/employee ID…" className="pl-9" />
        </div>
        <Select value={semF} onValueChange={setSemF}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All semesters</SelectItem>
            {SEMESTERS.map((s) => <SelectItem key={s} value={s}>{semLabel(s)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <EditUserDialog user={editUser} onClose={() => setEditUser(null)} onSaved={load} />

      <Card className="glass-card p-4">
        {loading ? (
          <p className="text-center py-6 text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-6 text-muted-foreground">No users match.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <div key={u.user_id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => openPhoto(u)} className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/30 hover:ring-primary transition group">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {u.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <Camera className="h-4 w-4 text-white" />
                    </div>
                  </button>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.email} {u.roll_number && `· ${u.roll_number}`} {u.employee_id && `· ${u.employee_id}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {u.semester && <Badge variant="secondary">{semLabel(u.semester)}{u.section ? ` · ${u.section}` : ""}</Badge>}
                  {u.role && <Badge variant="outline">{u.role}</Badge>}
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setEditUser(u)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                  <Select value={u.role ?? ""} onValueChange={(v) => changeRole(u.user_id, v as Role)}>
                    <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Set role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!photoUser} onOpenChange={(o) => !o && setPhotoUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Profile picture · {photoUser?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onFileChange(e.dataTransfer.files?.[0] ?? null); }}
              className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 text-center"
            >
              {preview ? (
                <img src={preview} alt="preview" className="w-32 h-32 rounded-full object-cover ring-2 ring-primary/40" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center"><Camera className="h-8 w-8 text-muted-foreground" /></div>
              )}
              <p className="text-xs text-muted-foreground">Drag & drop image, or click to browse (max 2MB)</p>
              <Input type="file" accept="image/*" onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={uploadPhoto} disabled={!file || uploading}>
                {uploading ? "Uploading…" : "Save photo"}
              </Button>
              {photoUser?.avatar_url && (
                <Button variant="outline" className="text-destructive" onClick={removePhoto}>
                  <Trash2 className="h-4 w-4 mr-1" /> Remove
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
