import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, FileText, Eye, Download } from "lucide-react";

export const AssignmentCreate = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [subjects, setSubjects] = useState<{ code: string; name: string }[]>([]);
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => supabase.from("assignments").select("*").order("created_at", { ascending: false }).then(({ data }) => setList(data ?? []));

  useEffect(() => {
    supabase.from("subjects").select("code, name").then(({ data }) => setSubjects((data as any) ?? []));
    refresh();
  }, []);

  const submit = async () => {
    if (!title || !subject || !user) { toast.error("Title and subject required"); return; }
    setBusy(true);
    let fileUrl: string | null = null;
    if (file) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("assignments").upload(path, file);
      if (upErr) { toast.error(upErr.message); setBusy(false); return; }
      fileUrl = path;
    }
    const { error } = await supabase.from("assignments").insert({
      title, description: desc, subject_code: subject, deadline: deadline || null, file_url: fileUrl, created_by: user.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Assignment created");
    setOpen(false); setTitle(""); setDesc(""); setSubject(""); setDeadline(""); setFile(null);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-muted-foreground">Create and manage assignments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New</Button></DialogTrigger>
          <DialogContent className="glass-card">
            <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
              <div>
                <Label>Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>{subjects.map((s) => <SelectItem key={s.code} value={s.code}>{s.code} – {s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Deadline</Label><Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
              <div><Label>Attachment (optional)</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
              <Button className="w-full" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {list.map((a, i) => (
          <Card key={a.id} className="glass-card p-4 flex items-start gap-3 animate-slide-up hover-lift" style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}>
            <FileText className="h-5 w-5 text-primary mt-1" />
            <div className="flex-1">
              <p className="font-semibold">{a.title}</p>
              <p className="text-sm text-muted-foreground">{a.subject_code} • Due {a.deadline ? new Date(a.deadline).toLocaleString() : "—"}</p>
              {a.description && <p className="text-sm mt-1">{a.description}</p>}
            </div>
            {a.file_url && (
              <div className="flex flex-col gap-1.5">
                <Button
                  size="sm" variant="outline"
                  onClick={async () => {
                    const { data, error } = await supabase.storage.from("assignments").createSignedUrl(a.file_url, 300);
                    if (error) return toast.error(error.message);
                    window.open(data.signedUrl, "_blank");
                  }}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> View
                </Button>
                <Button
                  size="sm" variant="outline"
                  onClick={async () => {
                    const fname = a.file_url.split("/").pop() ?? "file";
                    const { data, error } = await supabase.storage.from("assignments").createSignedUrl(a.file_url, 300, { download: fname });
                    if (error) return toast.error(error.message);
                    const link = document.createElement("a");
                    link.href = data.signedUrl; link.download = fname; link.click();
                  }}
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Download
                </Button>
              </div>
            )}
          </Card>
        ))}
        {list.length === 0 && <p className="text-center text-muted-foreground py-8">No assignments yet.</p>}
      </div>
    </div>
  );
};
