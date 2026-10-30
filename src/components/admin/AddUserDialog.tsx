import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { SEMESTERS, semLabel, defaultSectionForSem } from "@/lib/semesters";

export const AddUserDialog = ({ onCreated }: { onCreated: () => void }) => {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("student");
  const [fullName, setFullName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [branch, setBranch] = useState("CSE");
  const [semester, setSemester] = useState("I");
  const [section, setSection] = useState("CS11");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: { role, full_name: fullName, login_id: loginId, password, branch, semester: role === "admin" ? null : semester, section: section || null },
    });
    setSaving(false);
    const msg = (data as any)?.error ?? (error ? await (error as any).context?.json?.().then((j: any) => j.error).catch(() => error.message) : null);
    if (msg) { toast.error(msg); return; }
    toast.success(`${role} added — login ID: ${loginId}`);
    setFullName(""); setLoginId(""); setPassword("");
    setOpen(false); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><UserPlus className="h-4 w-4 mr-1" /> Add User</Button></DialogTrigger>
      <DialogContent className="glass-card max-w-md">
        <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Full Name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div>
            <Label>{role === "student" ? "Roll Number (login ID)" : "Employee ID (login ID)"}</Label>
            <Input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder={role === "student" ? "02303cse013" : "FAC010"} />
          </div>
          <div><Label>Password (min 6)</Label><Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          {role !== "admin" && (
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Branch</Label><Input value={branch} onChange={(e) => setBranch(e.target.value)} /></div>
              <div>
                <Label>Semester</Label>
                <Select value={semester} onValueChange={(v) => { setSemester(v); setSection(defaultSectionForSem(v)); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SEMESTERS.map((s) => <SelectItem key={s} value={s}>{semLabel(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Section</Label><Input value={section} onChange={(e) => setSection(e.target.value)} placeholder="CS31" /></div>
            </div>
          )}
          <Button className="w-full" onClick={submit} disabled={saving}>{saving ? "Adding…" : "Add User"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
