import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const ResultUpload = () => {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [list, setList] = useState<any[]>([]);
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [examType, setExamType] = useState("sessional1");
  const [marks, setMarks] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");

  const refresh = () => supabase.from("results").select("*").order("created_at", { ascending: false }).limit(50).then(({ data }) => setList(data ?? []));

  useEffect(() => {
    supabase.from("profiles").select("user_id, full_name, roll_number").not("roll_number", "is", null).then(({ data }) => setStudents(data ?? []));
    supabase.from("subjects").select("code, name").then(({ data }) => setSubjects(data ?? []));
    refresh();
  }, []);

  const submit = async () => {
    if (!studentId || !subject || !marks) { toast.error("All fields required"); return; }
    const { error } = await supabase.from("results").insert({
      student_id: studentId, subject_code: subject, exam_type: examType, marks: Number(marks), max_marks: Number(maxMarks),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Result uploaded");
    setOpen(false); setMarks(""); refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Results</h1><p className="text-muted-foreground">Upload student marks</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Upload</Button></DialogTrigger>
          <DialogContent className="glass-card">
            <DialogHeader><DialogTitle>Upload Result</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Student</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger><SelectValue placeholder="Pick student" /></SelectTrigger>
                  <SelectContent>{students.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.roll_number} – {s.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger><SelectValue placeholder="Pick subject" /></SelectTrigger>
                  <SelectContent>{subjects.map((s) => <SelectItem key={s.code} value={s.code}>{s.code} – {s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Exam Type</Label>
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sessional1">Sessional 1</SelectItem>
                    <SelectItem value="sessional2">Sessional 2</SelectItem>
                    <SelectItem value="put">PUT</SelectItem>
                    <SelectItem value="semester">Semester</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Marks</Label><Input type="number" value={marks} onChange={(e) => setMarks(e.target.value)} /></div>
                <div><Label>Max</Label><Input type="number" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} /></div>
              </div>
              <Button className="w-full" onClick={submit}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card p-4">
        {list.length === 0 ? <p className="text-center text-muted-foreground py-6">No results yet.</p> : (
          <div className="space-y-2">
            {list.map((r) => (
              <div key={r.id} className="flex justify-between p-2 rounded hover:bg-accent text-sm">
                <span>{r.subject_code} • {r.exam_type}</span>
                <span className="font-mono">{r.marks}/{r.max_marks}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
