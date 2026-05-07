import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserCog, Plus, Pencil, Trash2, Search } from "lucide-react";

interface FacultyRow {
  id: string;
  name: string;
  role: string | null;
  subjects: string[] | null;
  description: string | null;
  email: string | null;
  contact_email: string | null;
  mobile: string | null;
  room_no: string | null;
  available_time: string | null;
  experience: string | null;
  qualification: string | null;
  avatar_url: string | null;
}

const empty: Partial<FacultyRow> = {
  name: "", role: "", subjects: [], description: "", email: "", contact_email: "",
  mobile: "", room_no: "", available_time: "", experience: "", qualification: "", avatar_url: "",
};

export const FacultyAdmin = () => {
  const [rows, setRows] = useState<FacultyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<FacultyRow> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("faculty").select("*").order("name");
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name?.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const subjects = Array.isArray(editing.subjects)
      ? editing.subjects
      : String((editing as any).subjects ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const payload: any = { ...editing, subjects };
    delete payload.id;
    Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });

    const { error } = editing.id
      ? await supabase.from("faculty").update(payload).eq("id", editing.id)
      : await supabase.from("faculty").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this faculty entry?")) return;
    const { error } = await supabase.from("faculty").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  const filtered = rows.filter((r) =>
    !q || `${r.name} ${r.role} ${r.email} ${(r.subjects ?? []).join(" ")}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><UserCog className="h-7 w-7" /> Faculty Profiles</h1>
          <p className="text-muted-foreground">Add, edit, or remove faculty info shown to students</p>
        </div>
        <Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-1" /> Add Faculty</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search faculty…" className="pl-9" />
      </div>

      <Card className="glass-card p-4">
        {loading ? <p className="text-center py-6 text-muted-foreground">Loading…</p>
          : filtered.length === 0 ? <p className="text-center py-6 text-muted-foreground">No faculty yet.</p>
          : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.name} {r.role && <span className="text-xs text-muted-foreground">· {r.role}</span>}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.email ?? r.contact_email ?? "—"} {r.mobile && `· ${r.mobile}`} {r.room_no && `· Room ${r.room_no}`}
                  </p>
                  {r.subjects && r.subjects.length > 0 && (
                    <p className="text-[11px] text-muted-foreground truncate">Subjects: {r.subjects.join(", ")}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} Faculty</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ["name", "Full name *"],
                ["role", "Role (e.g. Director, HOD, Faculty)"],
                ["qualification", "Qualification"],
                ["experience", "Experience"],
                ["email", "Email"],
                ["contact_email", "Contact Email"],
                ["mobile", "Mobile"],
                ["room_no", "Room No"],
                ["available_time", "Available Time"],
                ["avatar_url", "Avatar URL"],
              ].map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{label}</label>
                  <Input
                    value={(editing as any)[key] ?? ""}
                    onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-muted-foreground">Subjects (comma-separated)</label>
                <Input
                  value={Array.isArray(editing.subjects) ? editing.subjects.join(", ") : (editing.subjects as any) ?? ""}
                  onChange={(e) => setEditing({ ...editing, subjects: e.target.value as any })}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-muted-foreground">About / Description</label>
                <Textarea
                  rows={4}
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
