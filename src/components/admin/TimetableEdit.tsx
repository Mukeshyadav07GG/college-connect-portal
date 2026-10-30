import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { SEMESTERS, semLabel, defaultSectionForSem, normDay } from "@/lib/semesters";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type Slot = { id?: string; day: string; slot: string; subject_code: string; faculty_name: string; room: string; semester: string; section: string; branch: string };

export const TimetableEdit = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [sem, setSem] = useState("VI");
  const [section, setSection] = useState("CS31");
  const [branch, setBranch] = useState("CSE");
  const [form, setForm] = useState<Slot | null>(null);

  const refresh = () => {
    let q = supabase.from("timetable").select("*").eq("semester", sem);
    if (section) q = q.eq("section", section);
    q.order("day").order("slot").then(({ data }) => setRows(data ?? []));
  };
  useEffect(() => { refresh(); }, [sem, section]);

  const openNew = () => setForm({ day: "Monday", slot: "1", subject_code: "", faculty_name: "", room: "", semester: sem, section, branch });
  const openEdit = (r: any) => setForm({ id: r.id, day: normDay(r.day), slot: String(r.slot), subject_code: r.subject_code ?? "", faculty_name: r.faculty_name ?? "", room: r.room ?? "", semester: r.semester, section: r.section, branch: r.branch });

  const submit = async () => {
    if (!form) return;
    if (!form.section.trim()) { toast.error("Section required"); return; }
    const payload = {
      branch: form.branch, section: form.section.trim().toUpperCase(), semester: form.semester, day: normDay(form.day),
      slot: Number(form.slot), subject_code: form.subject_code.trim() || null, faculty_name: form.faculty_name.trim() || null, room: form.room.trim() || null,
    };
    const { error } = form.id
      ? await supabase.from("timetable").update(payload).eq("id", form.id)
      : await supabase.from("timetable").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(form.id ? "Slot updated" : "Slot added");
    setForm(null); refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this slot?")) return;
    const { error } = await supabase.from("timetable").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  };

  const set = (k: keyof Slot, v: string) => form && setForm({ ...form, [k]: v });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-3 flex-wrap">
        <div><h1 className="text-3xl font-bold">Timetable ({semLabel(sem)}{section && ` · ${section}`})</h1><p className="text-muted-foreground">Add, edit or delete class slots for any semester</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Select value={sem} onValueChange={(v) => { setSem(v); setSection(defaultSectionForSem(v)); }}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{SEMESTERS.map((x) => <SelectItem key={x} value={x}>{semLabel(x)}</SelectItem>)}</SelectContent></Select>
            <Input className="w-28" value={section} onChange={(e) => setSection(e.target.value.trim())} placeholder="Section" />
            <Input className="w-24" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Branch" />
          </div></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Slot</Button>
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="glass-card">
          <DialogHeader><DialogTitle>{form?.id ? "Edit" : "Add"} Timetable Slot</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Semester</Label>
                  <Select value={form.semester} onValueChange={(v) => setForm({ ...form, semester: v, section: defaultSectionForSem(v) })}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SEMESTERS.map((x) => <SelectItem key={x} value={x}>{semLabel(x)}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Section</Label><Input value={form.section} onChange={(e) => set("section", e.target.value)} /></div>
                <div><Label>Branch</Label><Input value={form.branch} onChange={(e) => set("branch", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Day</Label>
                  <Select value={form.day} onValueChange={(v) => set("day", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Slot (1-8)</Label><Input type="number" min="1" max="8" value={form.slot} onChange={(e) => set("slot", e.target.value)} /></div>
              </div>
              <div><Label>Subject Code</Label><Input value={form.subject_code} onChange={(e) => set("subject_code", e.target.value)} placeholder="KCS-703" /></div>
              <div><Label>Faculty</Label><Input value={form.faculty_name} onChange={(e) => set("faculty_name", e.target.value)} /></div>
              <div><Label>Room</Label><Input value={form.room} onChange={(e) => set("room", e.target.value)} /></div>
              <Button className="w-full" onClick={submit}>{form.id ? "Save Changes" : "Add"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="glass-card p-4">
        <div className="space-y-1">
          {rows.map((r) => (
            <div key={r.id} className="flex justify-between items-center p-2 rounded hover:bg-accent text-sm">
              <span>{normDay(r.day)} • Slot {r.slot} — <strong>{r.subject_code}</strong> {r.faculty_name && `• ${r.faculty_name}`} {r.room && `• ${r.room}`} <span className="text-muted-foreground">• {r.section}</span></span>
              <div className="flex">
                <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="text-center text-muted-foreground py-6">No slots yet.</p>}
        </div>
      </Card>
    </div>
  );
};
