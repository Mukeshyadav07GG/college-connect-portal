import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const TimetableEdit = () => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [day, setDay] = useState("Mon");
  const [slot, setSlot] = useState("1");
  const [subjectCode, setSubjectCode] = useState("");
  const [faculty, setFaculty] = useState("");
  const [room, setRoom] = useState("");

  const refresh = () => supabase.from("timetable").select("*").eq("section", "CS31").order("day").order("slot").then(({ data }) => setRows(data ?? []));
  useEffect(() => { refresh(); }, []);

  const submit = async () => {
    const { error } = await supabase.from("timetable").insert({
      branch: "CSE", section: "CS31", semester: "VI", day, slot: Number(slot), subject_code: subjectCode, faculty_name: faculty, room,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Slot added");
    setOpen(false); refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("timetable").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Timetable (CS31)</h1><p className="text-muted-foreground">Edit class schedule</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add Slot</Button></DialogTrigger>
          <DialogContent className="glass-card">
            <DialogHeader><DialogTitle>Add Timetable Slot</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Day</Label>
                  <Select value={day} onValueChange={setDay}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Slot (1-8)</Label><Input type="number" min="1" max="8" value={slot} onChange={(e) => setSlot(e.target.value)} /></div>
              </div>
              <div><Label>Subject Code</Label><Input value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} placeholder="KCS-603" /></div>
              <div><Label>Faculty</Label><Input value={faculty} onChange={(e) => setFaculty(e.target.value)} /></div>
              <div><Label>Room</Label><Input value={room} onChange={(e) => setRoom(e.target.value)} /></div>
              <Button className="w-full" onClick={submit}>Add</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card p-4">
        <div className="space-y-1">
          {rows.map((r) => (
            <div key={r.id} className="flex justify-between items-center p-2 rounded hover:bg-accent text-sm">
              <span>{r.day} • Slot {r.slot} — <strong>{r.subject_code}</strong> {r.faculty_name && `• ${r.faculty_name}`} {r.room && `• ${r.room}`}</span>
              <Button variant="ghost" size="sm" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {rows.length === 0 && <p className="text-center text-muted-foreground py-6">No slots yet.</p>}
        </div>
      </Card>
    </div>
  );
};
