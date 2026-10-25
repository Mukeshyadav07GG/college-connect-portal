import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Student { user_id: string; full_name: string; roll_number: string | null; }

export const Attendance = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<{ code: string; name: string }[]>([]);
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, "present" | "absent">>({});
  const [gps, setGps] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.from("profiles").select("user_id, full_name, roll_number").not("roll_number", "is", null).then(({ data }) => {
      setStudents((data as Student[]) ?? []);
    });
    supabase.from("subjects").select("code, name").then(({ data }) => {
      setSubjects((data as any) ?? []);
    });
  }, []);

  // Load GPS self check-ins for the selected subject/date
  useEffect(() => {
    if (!subject) { setGps({}); return; }
    supabase.from("attendance").select("student_id, distance_meters, location_status")
      .eq("subject_code", subject).eq("date", date).eq("location_status", "verified")
      .then(({ data }) => {
        const g: Record<string, number> = {};
        const m: Record<string, "present"> = {};
        (data ?? []).forEach((r) => { g[r.student_id] = r.distance_meters ?? 0; m[r.student_id] = "present"; });
        setGps(g);
        setMarks((prev) => ({ ...prev, ...m }));
      });
  }, [subject, date]);

  const toggle = (uid: string) => {
    setMarks((m) => ({ ...m, [uid]: m[uid] === "present" ? "absent" : "present" }));
  };

  const save = async () => {
    if (!subject) { toast.error("Pick a subject"); return; }
    const rows = students.filter((s) => !(s.user_id in gps)).map((s) => ({
      student_id: s.user_id, subject_code: subject, date, status: marks[s.user_id] ?? "absent", marked_by: user?.id ?? null,
    }));
    if (rows.length === 0) { toast.success("All students already checked in"); return; }
    const { error } = await supabase.from("attendance").insert(rows);
    if (error) toast.error(error.message); else toast.success("Attendance saved");
  };

  const editAttendance = async (s: Student) => {
    if (!subject) { toast.error("Pick a subject"); return; }
    if (!user) { toast.error("Not signed in"); return; }
    const { data: rec, error: fetchErr } = await supabase
      .from("attendance")
      .select("id, status, marked_by")
      .eq("student_id", s.user_id)
      .eq("subject_code", subject)
      .eq("date", date)
      .maybeSingle();
    if (fetchErr) { toast.error(fetchErr.message); return; }
    if (!rec) { toast.error("No attendance record to edit"); return; }
    if (rec.marked_by !== user.id) { toast.error("Only the faculty who marked it can edit"); return; }
    const next = rec.status === "present" ? "absent" : "present";
    const { error: updErr } = await supabase
      .from("attendance")
      .update({ status: next })
      .eq("id", rec.id)
      .eq("marked_by", user.id);
    if (updErr) { toast.error(updErr.message); return; }
    setMarks((m) => ({ ...m, [s.user_id]: next as "present" | "absent" }));
    toast.success("Attendance Updated");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance</h1>
        <p className="text-muted-foreground">Mark and edit student attendance</p>
      </div>

      <Card className="glass-card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <Label>Subject</Label>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {subjects.map((s) => <SelectItem key={s.code} value={s.code}>{s.code} – {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button onClick={save}>Save</Button>
      </Card>

      <Card className="glass-card p-4">
        <div className="space-y-2">
          {students.map((s) => (
            <div key={s.user_id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent">
              <div>
                <p className="font-medium">{s.full_name}</p>
                <p className="text-xs text-muted-foreground">{s.roll_number}</p>
                {s.user_id in gps && (
                  <p className="text-xs text-success font-medium">📍 GPS verified ({Math.round(gps[s.user_id])} m)</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={marks[s.user_id] === "present" ? "default" : "outline"} onClick={() => toggle(s.user_id)}>
                  {marks[s.user_id] === "present" ? "Present" : "Absent"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => editAttendance(s)}>Edit</Button>
              </div>
            </div>
          ))}
          {students.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No students found.</p>}
        </div>
      </Card>
    </div>
  );
};
