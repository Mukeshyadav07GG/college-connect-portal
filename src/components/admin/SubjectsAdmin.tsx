import { useEffect, useState } from "react";
import { supabase } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Trash2, BookOpen, Pencil } from "lucide-react";

interface Subject {
  id: string;
  code: string;
  name: string;
  faculty_name: string | null;
  semester: string | null;
  branch: string | null;
  units: string[] | null;
  completion: number | null;
}

export const SubjectsAdmin = () => {
  const [list, setList] = useState<Subject[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [semester, setSemester] = useState("VI");
  const [branch, setBranch] = useState("CSE");
  const [units, setUnits] = useState("");
  const [completion, setCompletion] = useState("0");

  const refresh = () => supabase.from("subjects").select("*").order("code").then(({ data }) => setList((data as Subject[]) ?? []));
  useEffect(() => { refresh(); }, []);

  const reset = () => {
    setCode(""); setName(""); setFaculty(""); setSemester("VI"); setBranch("CSE"); setUnits(""); setCompletion("0"); setEditing(null);
  };

  const startEdit = (s: Subject) => {
    setEditing(s);
    setCode(s.code); setName(s.name); setFaculty(s.faculty_name ?? "");
    setSemester(s.semester ?? "VI"); setBranch(s.branch ?? "CSE");
    setUnits((s.units ?? []).join("\n"));
    setCompletion(String(s.completion ?? 0));
    setOpen(true);
  };

  const submit = async () => {
    if (!code || !name) { toast.error("Code and name required"); return; }
    const payload = {
      code, name, faculty_name: faculty || null, semester, branch,
      units: units.split("\n").map((u) => u.trim()).filter(Boolean),
      completion: Math.max(0, Math.min(100, Number(completion) || 0)),
    };
    const { error } = editing
      ? await supabase.from("subjects").update(payload).eq("id", editing.id)
      : await supabase.from("subjects").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Subject updated" : "Subject added");
    setOpen(false); reset(); refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold flex items-center gap-2"><BookOpen className="h-7 w-7" /> Subjects & Syllabus</h1>
          <p className="text-muted-foreground">Manage subjects, units and completion %</p></div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild><Button onClick={reset}><Plus className="h-4 w-4 mr-1" /> Add Subject</Button></DialogTrigger>
          <DialogContent className="glass-card max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Subject</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="KCS-601" /></div>
                <div><Label>Faculty</Label><Input value={faculty} onChange={(e) => setFaculty(e.target.value)} /></div>
              </div>
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Branch</Label><Input value={branch} onChange={(e) => setBranch(e.target.value)} /></div>
                <div><Label>Semester</Label><Input value={semester} onChange={(e) => setSemester(e.target.value)} /></div>
                <div><Label>Completion %</Label><Input type="number" min="0" max="100" value={completion} onChange={(e) => setCompletion(e.target.value)} /></div>
              </div>
              <div>
                <Label>Units (one per line)</Label>
                <Textarea rows={5} value={units} onChange={(e) => setUnits(e.target.value)} placeholder="Unit 1: Introduction&#10;Unit 2: ..." />
              </div>
              <Button className="w-full" onClick={submit}>{editing ? "Save Changes" : "Add Subject"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((s) => (
          <Card key={s.id} className="glass-card p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-mono text-xs font-bold text-primary">{s.code}</p>
                <h3 className="font-semibold text-sm">{s.name}</h3>
                <p className="text-xs text-muted-foreground">{s.faculty_name}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => startEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{(s.units ?? []).length} units</span>
                <span className="font-semibold">{s.completion ?? 0}%</span>
              </div>
              <Progress value={s.completion ?? 0} className="h-1.5" />
            </div>
          </Card>
        ))}
        {list.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No subjects yet.</p>}
      </div>
    </div>
  );
};
