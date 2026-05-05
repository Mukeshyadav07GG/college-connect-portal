import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Search, Camera, Trash2 } from "lucide-react";

type Role = "student" | "faculty" | "admin";

interface UserRow {
  user_id: string;
  full_name: string;
  email: string | null;
  roll_number: string | null;
  employee_id: string | null;
  branch: string | null;
  role: Role | null;
  avatar_url?: string | null;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filter, setFilter] = useState<"all" | Role>("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [photoUser, setPhotoUser] = useState<UserRow | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email, roll_number, employee_id, branch"),
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

  const filtered = users.filter((u) => {
    if (filter !== "all" && u.role !== filter) return false;
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
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Users className="h-7 w-7" /> User Management</h1>
        <p className="text-muted-foreground">View all users and change their roles</p>
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, roll/employee ID…" className="pl-9" />
      </div>

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
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {u.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.email} {u.roll_number && `· ${u.roll_number}`} {u.employee_id && `· ${u.employee_id}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {u.role && <Badge variant="outline">{u.role}</Badge>}
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
    </div>
  );
};
