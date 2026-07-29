import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileUp, Download, Eye, Loader2, Trash2, Save, MessageSquare } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Subject {
  id: string;
  code: string;
  name: string;
  faculty_name: string | null;
  branch: string | null;
  semester: string | null;
  completion: number;
}
interface Note { id: string; subject_code: string; unit_number: number | null; title: string; file_path: string; }
interface UnitRow { unit_number: number; progress: number }
interface Problem {
  id: string; student_id: string; subject_code: string; unit_number: number;
  title: string; file_url: string; created_at: string; student_name?: string;
}

const UNITS = [1, 2, 3, 4, 5];

export const Syllabus = () => {
  const { role, user, profile } = useAuth();
  const isFaculty = role === "faculty" || role === "admin";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [open, setOpen] = useState<Subject | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [units, setUnits] = useState<Record<number, number>>({});
  const [problems, setProblems] = useState<Problem[]>([]);

  // Faculty: notes upload
  const [uploadOpen, setUploadOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteUnit, setNoteUnit] = useState<string>("");
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Student: problem upload (per-unit)
  const [probUnit, setProbUnit] = useState<number | null>(null);
  const [probTitle, setProbTitle] = useState("");
  const [probFile, setProbFile] = useState<File | null>(null);
  const [probBusy, setProbBusy] = useState(false);

  // Faculty filter: only their assigned subjects (by faculty_name match)
  const visibleSubjects = useMemo(() => {
    if (!isFaculty) return subjects; // students see all subjects of their semester
    if (role === "admin") return subjects;
    if (!profile?.full_name) return [];
    return subjects.filter(
      (s) => (s.faculty_name ?? "").trim().toLowerCase() === profile.full_name.trim().toLowerCase()
    );
  }, [subjects, isFaculty, role, profile?.full_name]);

  useEffect(() => {
    const sem = profile?.semester ?? "VI";
    supabase.from("subjects").select("*").eq("semester", sem).order("code")
      .then(({ data }) => setSubjects((data ?? []) as Subject[]));
  }, [profile?.semester]);

  const loadDetails = async (s: Subject) => {
    const [{ data: n }, { data: u }, { data: p }] = await Promise.all([
      supabase.from("subject_notes").select("id,subject_code,unit_number,title,file_path").eq("subject_code", s.code).order("unit_number"),
      supabase.from("syllabus_units").select("unit_number,progress").eq("subject_code", s.code),
      supabase.from("syllabus_problems").select("*").eq("subject_code", s.code).order("created_at", { ascending: false }),
    ]);
    setNotes((n ?? []) as Note[]);
    const map: Record<number, number> = {};
    (u ?? []).forEach((r: any) => { map[r.unit_number] = r.progress; });
    setUnits(map);

    // Enrich problems with student names (faculty view)
    const problemsRows = (p ?? []) as Problem[];
    if (isFaculty && problemsRows.length) {
      const ids = [...new Set(problemsRows.map((x) => x.student_id))];
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, roll_number").in("user_id", ids);
      const nameMap = new Map((profs ?? []).map((x: any) => [x.user_id, `${x.full_name}${x.roll_number ? ` (${x.roll_number})` : ""}`]));
      setProblems(problemsRows.map((r) => ({ ...r, student_name: nameMap.get(r.student_id) ?? "Unknown" })));
    } else {
      setProblems(problemsRows);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadDetails(open);
    // realtime subscription on units & problems for this subject
    const ch = supabase
      .channel(`syllabus_${open.code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "syllabus_units", filter: `subject_code=eq.${open.code}` }, () => loadDetails(open))
      .on("postgres_changes", { event: "*", schema: "public", table: "syllabus_problems", filter: `subject_code=eq.${open.code}` }, () => loadDetails(open))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.code]);

  const overall = useMemo(() => {
    const sum = UNITS.reduce((acc, u) => acc + (units[u] ?? 0), 0);
    return Math.round(sum / 5);
  }, [units]);

  const setUnit = (u: number, v: number) =>
    setUnits((m) => ({ ...m, [u]: Math.max(0, Math.min(100, v)) }));

  const saveUnit = async (u: number) => {
    if (!open) return;
    try {
      const { error } = await supabase.rpc("update_unit_progress", {
        _subject_code: open.code, _unit_number: u, _progress: units[u] ?? 0,
      });
      if (error) throw error;
      toast.success(`Unit ${u} progress saved`);
      // refresh subject completion in card list
      setSubjects((arr) => arr.map((s) => s.code === open.code ? { ...s, completion: overall } : s));
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    }
  };

  const view = async (path: string) => {
    const { data, error } = await supabase.storage.from("subject-notes").createSignedUrl(path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };
  const download = async (path: string, title: string) => {
    const { data, error } = await supabase.storage.from("subject-notes").createSignedUrl(path, 300, { download: title });
    if (error) return toast.error(error.message);
    const a = document.createElement("a"); a.href = data.signedUrl; a.download = title; a.click();
  };
  const openProblem = async (fileOrPath: string, downloadName?: string) => {
    // Backward compat: if it's a full URL (legacy public bucket), open directly
    if (/^https?:\/\//.test(fileOrPath)) {
      window.open(fileOrPath, "_blank");
      return;
    }
    const opts = downloadName ? { download: downloadName } : undefined;
    const { data, error } = await supabase.storage
      .from("syllabus-problems")
      .createSignedUrl(fileOrPath, 300, opts as any);
    if (error) return toast.error(error.message);
    if (downloadName) {
      const a = document.createElement("a");
      a.href = data.signedUrl; a.download = downloadName; a.click();
    } else {
      window.open(data.signedUrl, "_blank");
    }
  };
  const removeNote = async (n: Note) => {
    await supabase.storage.from("subject-notes").remove([n.file_path]);
    await supabase.from("subject_notes").delete().eq("id", n.id);
    setNotes((arr) => arr.filter((x) => x.id !== n.id));
    toast.success("Note removed");
  };

  const uploadNote = async () => {
    if (!open || !noteTitle.trim() || !noteFile || !noteUnit) return toast.error("Title, unit and file required");
    setUploading(true);
    try {
      const ext = noteFile.name.split(".").pop();
      const path = `${open.code}/u${noteUnit}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("subject-notes").upload(path, noteFile);
      if (upErr) throw upErr;
      const { data: ins, error: dbErr } = await supabase.from("subject_notes").insert({
        subject_code: open.code, unit_number: Number(noteUnit), title: noteTitle.trim(), file_path: path,
      }).select().single();
      if (dbErr) throw dbErr;
      setNotes((arr) => [...arr, ins as Note]);
      setUploadOpen(false); setNoteTitle(""); setNoteUnit(""); setNoteFile(null);
      toast.success("Notes uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally { setUploading(false); }
  };

  const uploadProblem = async (unit: number) => {
    if (!open || !user || !probTitle.trim() || !probFile) return toast.error("Title and file required");
    setProbBusy(true);
    try {
      const ext = probFile.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${open.code}/u${unit}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("syllabus-problems").upload(path, probFile, {
        contentType: probFile.type || "application/octet-stream",
      });
      if (upErr) throw upErr;
      const { error: dErr } = await supabase.from("syllabus_problems").insert({
        student_id: user.id, subject_code: open.code, unit_number: unit,
        title: probTitle.trim(), file_url: path,
      });
      if (dErr) throw dErr;
      toast.success("Problem submitted");
      setProbTitle(""); setProbFile(null); setProbUnit(null);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setProbBusy(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="animate-slide-up">
        <h1 className="font-display text-3xl font-bold mb-1">Syllabus</h1>
        <p className="text-muted-foreground text-sm">
          {isFaculty ? "Manage units, notes and view student doubts." : "Track progress, download notes and submit doubts."}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleSubjects.map((s, i) => (
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
        {visibleSubjects.length === 0 && (
          <div className="col-span-full text-center text-sm text-muted-foreground py-10">
            {isFaculty ? "No subjects assigned to you yet." : "No subjects available."}
          </div>
        )}
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="glass-strong max-w-3xl animate-scale-in max-h-[90vh] overflow-y-auto">
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
                  <span className="text-muted-foreground">Overall completion (avg of 5 units)</span>
                  <span className="font-display font-bold text-xl gradient-text">{overall}%</span>
                </div>
                <Progress value={overall} className="h-2" />
              </div>

              <Accordion type="single" collapsible className="mt-4">
                {UNITS.map((u) => {
                  const unitNotes = notes.filter((n) => n.unit_number === u);
                  const unitProblems = problems.filter((p) => p.unit_number === u);
                  const value = units[u] ?? 0;
                  return (
                    <AccordionItem key={u} value={`u${u}`} className="border-glass-border">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 flex-1 pr-3">
                          <Badge variant="outline" className="font-mono">UNIT {u}</Badge>
                          <Progress value={value} className="h-1.5 flex-1" />
                          <span className="text-xs font-bold text-primary w-10 text-right">{value}%</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        {/* Faculty progress control */}
                        {isFaculty && (
                          <div className="glass rounded-xl p-3 space-y-3">
                            <div className="text-xs uppercase tracking-wider text-muted-foreground">Set Progress</div>
                            <div className="flex items-center gap-3">
                              <Slider value={[value]} max={100} step={5} onValueChange={(v) => setUnit(u, v[0])} className="flex-1" />
                              <Input type="number" min={0} max={100} value={value}
                                onChange={(e) => setUnit(u, Number(e.target.value) || 0)} className="w-20" />
                              <Button size="sm" onClick={() => saveUnit(u)}><Save className="w-3.5 h-3.5 mr-1" /> Save</Button>
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Notes</h4>
                            {isFaculty && (
                              <Button size="sm" variant="outline" onClick={() => { setNoteUnit(String(u)); setUploadOpen(true); }}>
                                <FileUp className="w-3.5 h-3.5 mr-1.5" /> Upload
                              </Button>
                            )}
                          </div>
                          {unitNotes.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic text-center py-3">No notes yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {unitNotes.map((n) => (
                                <div key={n.id} className="glass rounded-xl p-3 flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <BookOpen className="w-4 h-4 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{n.title}</div>
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => view(n.file_path)} title="View"><Eye className="w-3.5 h-3.5" /></Button>
                                  <Button size="sm" variant="ghost" onClick={() => download(n.file_path, n.title)} title="Download"><Download className="w-3.5 h-3.5" /></Button>
                                  {isFaculty && (
                                    <Button size="sm" variant="ghost" onClick={() => removeNote(n)} title="Delete"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Problems */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5" /> {isFaculty ? "Student Problems" : "Submit a Problem"}
                            </h4>
                            {!isFaculty && (
                              <Button size="sm" variant="outline" onClick={() => setProbUnit(probUnit === u ? null : u)}>
                                <FileUp className="w-3.5 h-3.5 mr-1.5" /> {probUnit === u ? "Cancel" : "Upload"}
                              </Button>
                            )}
                          </div>

                          {!isFaculty && probUnit === u && (
                            <div className="glass rounded-xl p-3 space-y-2 mb-3">
                              <Input placeholder="Problem title / question…" value={probTitle} onChange={(e) => setProbTitle(e.target.value)} />
                              <Input type="file" onChange={(e) => setProbFile(e.target.files?.[0] ?? null)} />
                              <Button size="sm" disabled={probBusy} onClick={() => uploadProblem(u)} className="w-full">
                                {probBusy && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />} Submit
                              </Button>
                            </div>
                          )}

                          {unitProblems.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic text-center py-3">
                              {isFaculty ? "No student doubts yet." : "Your submitted doubts appear here."}
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {unitProblems.map((p) => (
                                <div key={p.id} className="glass rounded-xl p-3 flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-lg bg-accent/30 flex items-center justify-center flex-shrink-0">
                                    <MessageSquare className="w-4 h-4 text-foreground" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{p.title}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {isFaculty && <span className="mr-2">{p.student_name}</span>}
                                      {new Date(p.created_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => openProblem(p.file_url)}><Eye className="w-3.5 h-3.5" /></Button>
                                  <Button size="sm" variant="ghost" onClick={() => openProblem(p.file_url, p.title)}><Download className="w-3.5 h-3.5" /></Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="glass-strong max-w-md animate-scale-in">
          <DialogTitle>Upload notes</DialogTitle>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Title</Label>
              <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="e.g. Process synchronization" />
            </div>
            <div>
              <Label>Unit</Label>
              <Input type="number" min={1} max={5} value={noteUnit} onChange={(e) => setNoteUnit(e.target.value)} placeholder="1-5" />
            </div>
            <div>
              <Label>File (PDF/DOCX/PPT)</Label>
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
