import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, CheckCircle2, Circle, FileUp, Download, Eye, Loader2, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Subject {
  id: string;
  code: string;
  name: string;
  faculty_name: string | null;
  units: string[];
  completion: number;
}

interface Note {
  id: string;
  subject_code: string;
  unit_number: number | null;
  title: string;
  file_path: string;
  created_at: string;
}

export const Syllabus = () => {
  const { role } = useAuth();
  const isFaculty = role === "faculty" || role === "admin";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [open, setOpen] = useState<Subject | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteUnit, setNoteUnit] = useState("");
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.from("subjects").select("*").eq("semester", "VI").order("code")
      .then(({ data }) => setSubjects((data ?? []).map((s: any) => ({ ...s, units: s.units ?? [] }))));
  }, []);

  useEffect(() => {
    if (!open) return;
    supabase.from("subject_notes").select("*").eq("subject_code", open.code).order("unit_number")
      .then(({ data }) => setNotes((data ?? []) as Note[]));
  }, [open]);

  const view = async (path: string) => {
    const { data, error } = await supabase.storage.from("subject-notes").createSignedUrl(path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const download = async (path: string, title: string) => {
    const { data, error } = await supabase.storage.from("subject-notes").createSignedUrl(path, 300, { download: title });
    if (error) return toast.error(error.message);
    const a = document.createElement("a");
    a.href = data.signedUrl; a.download = title; a.click();
  };

  const removeNote = async (n: Note) => {
    await supabase.storage.from("subject-notes").remove([n.file_path]);
    await supabase.from("subject_notes").delete().eq("id", n.id);
    setNotes((arr) => arr.filter((x) => x.id !== n.id));
    toast.success("Note removed");
  };

  const uploadNote = async () => {
    if (!open || !noteTitle.trim() || !noteFile) return toast.error("Title and file required");
    setUploading(true);
    try {
      const ext = noteFile.name.split(".").pop();
      const path = `${open.code}/${Date.now()}-${noteTitle.replace(/[^a-z0-9]/gi, "_")}.${ext}`;
      const { error: upErr } = await supabase.storage.from("subject-notes").upload(path, noteFile);
      if (upErr) throw upErr;
      const { data: ins, error: dbErr } = await supabase.from("subject_notes").insert({
        subject_code: open.code,
        unit_number: noteUnit ? Number(noteUnit) : null,
        title: noteTitle.trim(),
        file_path: path,
      }).select().single();
      if (dbErr) throw dbErr;
      setNotes((arr) => [...arr, ins as Note].sort((a, b) => (a.unit_number ?? 99) - (b.unit_number ?? 99)));
      setUploadOpen(false); setNoteTitle(""); setNoteUnit(""); setNoteFile(null);
      toast.success("Notes uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="animate-slide-up">
        <h1 className="font-display text-3xl font-bold mb-1">Syllabus</h1>
        <p className="text-muted-foreground text-sm">Track unit completion and download summary notes.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setOpen(s)}
            className="glass rounded-2xl p-5 hover-lift hover-glow text-left animate-slide-up group"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xs font-mono font-bold text-primary">{s.code}</span>
            </div>
            <h3 className="font-display font-bold text-sm mb-1">{s.name}</h3>
            <p className="text-[11px] text-muted-foreground mb-3">{s.faculty_name}</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-bold gradient-text">{s.completion}%</span>
              </div>
              <Progress value={s.completion} className="h-1.5" />
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="glass-strong max-w-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
          {open && (
            <>
              <DialogTitle className="font-display flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground font-mono font-bold text-xs shadow-glow">
                  {open.code}
                </div>
                <div>
                  <div>{open.name}</div>
                  <div className="text-xs text-muted-foreground font-normal font-sans">{open.faculty_name}</div>
                </div>
              </DialogTitle>

              <div className="glass rounded-xl p-4 mt-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Overall completion</span>
                  <span className="font-display font-bold text-xl gradient-text">{open.completion}%</span>
                </div>
                <Progress value={open.completion} className="h-2" />
              </div>

              {/* Units */}
              <div className="mt-4">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Units</h4>
                <div className="space-y-2">
                  {open.units.map((u, i) => {
                    const done = (i + 1) / open.units.length * 100 <= open.completion;
                    return (
                      <div key={i} className="glass rounded-xl p-3 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                        {done ? <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" /> : <Circle className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />}
                        <div className="flex-1">
                          <div className="text-[10px] text-muted-foreground">UNIT {i + 1}</div>
                          <div className="text-sm font-medium">{u}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Summary notes</h4>
                  {isFaculty && (
                    <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
                      <FileUp className="w-3.5 h-3.5 mr-1.5" /> Upload notes
                    </Button>
                  )}
                </div>
                {notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No notes uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {notes.map((n, i) => (
                      <div key={n.id} className="glass rounded-xl p-3 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {n.unit_number != null && <div className="text-[10px] text-muted-foreground">UNIT {n.unit_number}</div>}
                          <div className="text-sm font-medium truncate">{n.title}</div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => view(n.file_path)} title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => download(n.file_path, n.title)} title="Download">
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        {isFaculty && (
                          <Button size="sm" variant="ghost" onClick={() => removeNote(n)} title="Delete">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload notes dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="glass-strong max-w-md animate-scale-in">
          <DialogTitle>Upload summary notes</DialogTitle>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Title</Label>
              <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="e.g. Unit 2 — Process synchronization" />
            </div>
            <div>
              <Label>Unit number (optional)</Label>
              <Input type="number" min={1} value={noteUnit} onChange={(e) => setNoteUnit(e.target.value)} placeholder="1-5" />
            </div>
            <div>
              <Label>File (PDF/DOCX)</Label>
              <Input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={(e) => setNoteFile(e.target.files?.[0] ?? null)} />
              {noteFile && <p className="text-xs text-muted-foreground mt-1">{noteFile.name} ({(noteFile.size / 1024).toFixed(0)} KB)</p>}
            </div>
            <Button onClick={uploadNote} disabled={uploading} className="w-full glow-button">
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
