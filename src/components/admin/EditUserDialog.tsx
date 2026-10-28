import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { SEMESTERS, semLabel } from "@/lib/semesters";

export interface EditableUser {
  user_id: string; full_name: string; roll_number: string | null; employee_id: string | null;
  branch: string | null; semester: string | null; section: string | null; phone?: string | null;
  role: "student" | "faculty" | "admin" | null;
}

export const EditUserDialog = ({ user, onClose, onSaved }: { user: EditableUser | null; onClose: () => void; onSaved: () => void }) => {
  const [f, setF] = useState<EditableUser | null>(user);
  const [saving, setSaving] = useState(false);
  useEffect(() => setF(user), [user]);
  if (!f) return null;
  const set = (k: keyof EditableUser, v: string) => setF({ ...f, [k]: v });

  const save = async () => {
    if (!f.full_name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: f.full_name.trim(),
      roll_number: f.role === "student" ? (f.roll_number?.trim() || null) : f.roll_number,
      employee_id: f.role !== "student" ? (f.employee_id?.trim() || null) : f.employee_id,
      branch: f.branch?.trim() || null,
      semester: f.role === "admin" ? null : f.semester,
      section: f.section?.trim() || null,
      phone: f.phone?.trim() || null,
    }).eq("user_id", f.user_id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("User updated"); onSaved(); onClose();
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card max-w-md">
        <DialogHeader><DialogTitle>Edit User · {user?.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Full Name</Label><Input value={f.full_name} onChange={(e) => set("full_name", e.target.value)} /></div>
          {f.role === "student" ? (
            <div><Label>Roll Number</Label><Input value={f.roll_number ?? ""} onChange={(e) => set("roll_number", e.target.value)} /></div>
          ) : (
            <div><Label>Employee ID</Label><Input value={f.employee_id ?? ""} onChange={(e) => set("employee_id", e.target.value)} /></div>
          )}
          <div><Label>Phone</Label><Input value={f.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
          {f.role !== "admin" && (
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Branch</Label><Input value={f.branch ?? ""} onChange={(e) => set("branch", e.target.value)} /></div>
              <div>
                <Label>Semester</Label>
                <Select value={f.semester ?? ""} onValueChange={(v) => set("semester", v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{SEMESTERS.map((s) => <SelectItem key={s} value={s}>{semLabel(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Section</Label><Input value={f.section ?? ""} onChange={(e) => set("section", e.target.value)} /></div>
            </div>
          )}
          <Button className="w-full" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
