import { useEffect, useState } from "react";
import { supabase } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Plus, Pencil, Trash2, Search, Wifi } from "lucide-react";

interface Allocation {
  id: string;
  student_id: string;
  hostel_name: string;
  hostel_type: "Boys" | "Girls";
  room_no: string;
  sharing: number;
  floor: string | null;
  ac_type: "AC" | "Non-AC";
  wifi: boolean;
}
interface Student { user_id: string; full_name: string; roll_number: string | null; }

const empty = {
  student_id: "",
  hostel_name: "",
  hostel_type: "Boys" as "Boys" | "Girls",
  room_no: "",
  sharing: 2,
  floor: "",
  ac_type: "Non-AC" as "AC" | "Non-AC",
  wifi: true,
};

export const HostelAllocations = () => {
  const [rows, setRows] = useState<Allocation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [{ data: a }, { data: roles }] = await Promise.all([
      supabase.from("hostel_allocations" as any).select("*").order("hostel_name"),
      supabase.from("user_roles").select("user_id").eq("role", "student"),
    ]);
    const studentIds = (roles ?? []).map((r: any) => r.user_id);
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, roll_number")
      .in("user_id", studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"]);
    setRows((a as any) ?? []);
    setStudents((profs as any) ?? []);
  };

  useEffect(() => { load(); }, []);

  const studentMap = new Map(students.map((s) => [s.user_id, s]));

  const openNew = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (a: Allocation) => {
    setEditId(a.id);
    setForm({
      student_id: a.student_id,
      hostel_name: a.hostel_name,
      hostel_type: a.hostel_type,
      room_no: a.room_no,
      sharing: a.sharing,
      floor: a.floor ?? "",
      ac_type: a.ac_type,
      wifi: a.wifi,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.student_id || !form.hostel_name || !form.room_no) {
      toast.error("Student, hostel name, and room are required");
      return;
    }
    const payload = { ...form, floor: form.floor || null };
    const { error } = editId
      ? await supabase.from("hostel_allocations" as any).update(payload).eq("id", editId)
      : await supabase.from("hostel_allocations" as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editId ? "Allocation updated" : "Allocation assigned");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this allocation?")) return;
    const { error } = await supabase.from("hostel_allocations" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removed"); load(); }
  };

  const filtered = rows.filter((r) => {
    const s = studentMap.get(r.student_id);
    const hay = `${s?.full_name ?? ""} ${s?.roll_number ?? ""} ${r.hostel_name} ${r.room_no}`.toLowerCase();
    return !q || hay.includes(q.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Building2 className="h-7 w-7" /> Hostel Allocations</h1>
          <p className="text-muted-foreground">Assign and manage hostel rooms for students</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Assign</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Assign"} Hostel</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Student</Label>
                <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })} disabled={!!editId}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {students.map((s) => (
                      <SelectItem key={s.user_id} value={s.user_id}>{s.full_name} {s.roll_number ? `· ${s.roll_number}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Hostel Name</Label>
                  <Input value={form.hostel_name} onChange={(e) => setForm({ ...form, hostel_name: e.target.value })} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.hostel_type} onValueChange={(v: any) => setForm({ ...form, hostel_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Boys">Boys</SelectItem>
                      <SelectItem value="Girls">Girls</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Room No</Label>
                  <Input value={form.room_no} onChange={(e) => setForm({ ...form, room_no: e.target.value })} />
                </div>
                <div>
                  <Label>Sharing</Label>
                  <Input type="number" min={1} max={6} value={form.sharing} onChange={(e) => setForm({ ...form, sharing: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Floor</Label>
                  <Input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
                </div>
                <div>
                  <Label>AC Type</Label>
                  <Select value={form.ac_type} onValueChange={(v: any) => setForm({ ...form, ac_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AC">AC</SelectItem>
                      <SelectItem value="Non-AC">Non-AC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 rounded border">
                <Label className="flex items-center gap-2"><Wifi className="h-4 w-4" /> WiFi</Label>
                <Switch checked={form.wifi} onCheckedChange={(v) => setForm({ ...form, wifi: v })} />
              </div>
              <Button className="w-full" onClick={save}>{editId ? "Update" : "Assign"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by student, hostel, room…" className="pl-9" />
      </div>

      <Card className="glass-card p-4">
        {filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No allocations yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((r) => {
              const s = studentMap.get(r.student_id);
              return (
                <div key={r.id} className="p-4 rounded-xl border bg-card/60 hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{s?.full_name ?? "Unknown student"}</p>
                      <p className="text-xs text-muted-foreground">{s?.roll_number}</p>
                    </div>
                    <Badge variant="outline">{r.hostel_type}</Badge>
                  </div>
                  <div className="mt-3 text-sm space-y-1">
                    <p><span className="text-muted-foreground">Hostel:</span> {r.hostel_name}</p>
                    <p><span className="text-muted-foreground">Room:</span> {r.room_no} · {r.sharing}-share {r.floor && `· Floor ${r.floor}`}</p>
                    <p className="flex gap-2 flex-wrap">
                      <Badge variant="secondary">{r.ac_type}</Badge>
                      <Badge variant={r.wifi ? "default" : "secondary"}>{r.wifi ? "WiFi" : "No WiFi"}</Badge>
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(r.id)}><Trash2 className="h-3 w-3 mr-1" /> Remove</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
