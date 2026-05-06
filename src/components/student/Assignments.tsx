import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  Download,
  Eye,
  ArrowLeft,
  BookOpen,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Subject {
  code: string;
  name: string;
  faculty_name: string | null;
  semester: string | null;
  branch: string | null;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  subject_code: string | null;
  deadline: string | null;
  file_url: string | null;
  created_by: string | null;
}

interface Submission {
  assignment_id: string;
  file_url: string;
  submitted_at: string;
}

export const Assignments = () => {
  const { user, profile } = useAuth();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [facultyIdByName, setFacultyIdByName] = useState<Record<string, string>>({});
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);

  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [viewAssignment, setViewAssignment] = useState<Assignment | null>(null);
  const [uploadFor, setUploadFor] = useState<Assignment | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Subjects for the student's branch / semester (fallback: all)
    let subjectsQuery = supabase.from("subjects").select("code,name,faculty_name,semester,branch");
    if (profile?.branch) subjectsQuery = subjectsQuery.eq("branch", profile.branch);
    if (profile?.semester) subjectsQuery = subjectsQuery.eq("semester", profile.semester);

    const [{ data: subj }, { data: a }, { data: s }, { data: profs }] = await Promise.all([
      subjectsQuery,
      supabase.from("assignments").select("*").order("deadline", { ascending: true, nullsFirst: false }),
      supabase
        .from("assignment_submissions")
        .select("assignment_id,file_url,submitted_at")
        .eq("student_id", user.id),
      supabase.rpc("get_profile_directory"),
    ]);

    setSubjects((subj as Subject[]) ?? []);
    setAssignments((a as Assignment[]) ?? []);

    const map: Record<string, Submission> = {};
    (s ?? []).forEach((row: any) => {
      map[row.assignment_id] = row;
    });
    setSubmissions(map);

    // Build name → user_id map so we can verify the assignment author matches the subject's faculty
    const idMap: Record<string, string> = {};
    (profs ?? []).forEach((p: any) => {
      if (p.full_name) idMap[p.full_name.trim().toLowerCase()] = p.user_id;
    });
    setFacultyIdByName(idMap);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user, profile?.branch, profile?.semester]);

  // Strict filter: only assignments whose subject_code matches AND whose creator matches the subject's faculty
  const assignmentsForActive = useMemo(() => {
    if (!activeSubject) return [];
    const expectedFacultyId =
      activeSubject.faculty_name && facultyIdByName[activeSubject.faculty_name.trim().toLowerCase()];
    return assignments.filter((a) => {
      if (a.subject_code !== activeSubject.code) return false;
      // If we can resolve the faculty's user_id, enforce strict match.
      // If not (legacy data), allow it through so things still appear.
      if (expectedFacultyId) return a.created_by === expectedFacultyId;
      return true;
    });
  }, [activeSubject, assignments, facultyIdByName]);

  const countsBySubject = useMemo(() => {
    const out: Record<string, number> = {};
    for (const subj of subjects) {
      const expectedFacultyId =
        subj.faculty_name && facultyIdByName[subj.faculty_name.trim().toLowerCase()];
      out[subj.code] = assignments.filter((a) => {
        if (a.subject_code !== subj.code) return false;
        if (expectedFacultyId) return a.created_by === expectedFacultyId;
        return true;
      }).length;
    }
    return out;
  }, [subjects, assignments, facultyIdByName]);

  const handleUpload = async () => {
    if (!file || !uploadFor || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${uploadFor.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("submissions")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("assignment_submissions").upsert(
        {
          assignment_id: uploadFor.id,
          student_id: user.id,
          file_url: path,
        },
        { onConflict: "assignment_id,student_id" }
      );
      if (dbErr) throw dbErr;
      toast.success("Assignment submitted!");
      setUploadFor(null);
      setFile(null);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const isOverdue = (d: string | null) => d && new Date(d) < new Date();

  const viewFile = async (path: string) => {
    const { data, error } = await supabase.storage.from("assignments").createSignedUrl(path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const downloadFile = async (path: string) => {
    const fname = path.split("/").pop() ?? "assignment";
    const { data, error } = await supabase.storage
      .from("assignments")
      .createSignedUrl(path, 300, { download: fname });
    if (error) return toast.error(error.message);
    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = fname;
    link.click();
  };

  // ============ SUBJECT-LIST VIEW ============
  if (!activeSubject) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Assignments</h1>
          <p className="text-muted-foreground text-sm">
            Pick a subject to view assignments from its faculty.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : subjects.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium">No subjects assigned</p>
            <p className="text-xs text-muted-foreground mt-1">
              Contact the admin to set up your branch &amp; semester
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((s, i) => (
              <button
                key={s.code}
                onClick={() => setActiveSubject(s)}
                className="glass rounded-2xl p-5 hover-lift animate-slide-up text-left transition-all hover:ring-2 hover:ring-primary/40"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold">
                    {s.code}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/40 font-medium">
                    {countsBySubject[s.code] ?? 0} {(countsBySubject[s.code] ?? 0) === 1 ? "task" : "tasks"}
                  </span>
                </div>
                <h3 className="font-display font-bold mb-1.5 leading-tight">{s.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  {s.faculty_name ?? "Faculty TBA"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============ SUBJECT-DETAIL VIEW ============
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-start gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveSubject(null)}
          className="mt-1"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <div className="text-xs font-mono font-bold text-primary mb-0.5">{activeSubject.code}</div>
          <h1 className="font-display text-3xl font-bold leading-tight">{activeSubject.name}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
            <User className="w-3.5 h-3.5" />
            {activeSubject.faculty_name ?? "Faculty TBA"}
          </p>
        </div>
      </div>

      {assignmentsForActive.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">No assignments for this subject yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Posted assignments from {activeSubject.faculty_name ?? "the faculty"} will appear here
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignmentsForActive.map((a, i) => {
            const sub = submissions[a.id];
            const overdue = isOverdue(a.deadline) && !sub;
            return (
              <div
                key={a.id}
                className="glass rounded-2xl p-5 hover-lift animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold">
                    {a.subject_code ?? "GEN"}
                  </span>
                  {sub ? (
                    <span className="text-[10px] flex items-center gap-1 text-success font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Submitted
                    </span>
                  ) : overdue ? (
                    <span className="text-[10px] text-destructive font-medium">Overdue</span>
                  ) : null}
                </div>
                <h3 className="font-display font-bold mb-1">{a.title}</h3>
                {a.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{a.description}</p>
                )}
                {a.deadline && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                    <Calendar className="w-3 h-3" />
                    Due{" "}
                    {new Date(a.deadline).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 min-w-[70px]"
                    onClick={() => setViewAssignment(a)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> View
                  </Button>
                  {a.file_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 min-w-[70px]"
                      onClick={() => downloadFile(a.file_url!)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> Get
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className={`flex-1 min-w-[70px] ${sub ? "" : "glow-button"}`}
                    variant={sub ? "outline" : "default"}
                    onClick={() => setUploadFor(a)}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    {sub ? "Re-submit" : "Submit"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View details modal */}
      <Dialog open={!!viewAssignment} onOpenChange={(v) => !v && setViewAssignment(null)}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogTitle className="font-display">{viewAssignment?.title}</DialogTitle>
          {viewAssignment && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold">
                  {viewAssignment.subject_code}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-accent/40">
                  {activeSubject?.faculty_name}
                </span>
                {viewAssignment.deadline && (
                  <span className="px-2 py-0.5 rounded-full bg-accent/40 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(viewAssignment.deadline).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              {viewAssignment.description ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {viewAssignment.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description provided.</p>
              )}
              {submissions[viewAssignment.id] && (
                <div className="glass rounded-xl p-3 text-xs flex items-center gap-2 text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  Submitted on{" "}
                  {new Date(submissions[viewAssignment.id].submitted_at).toLocaleString()}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                {viewAssignment.file_url && (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => viewFile(viewAssignment.file_url!)}
                    >
                      <Eye className="w-4 h-4 mr-1.5" /> Open file
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => downloadFile(viewAssignment.file_url!)}
                    >
                      <Download className="w-4 h-4 mr-1.5" /> Download
                    </Button>
                  </>
                )}
                <Button
                  className="flex-1 glow-button"
                  onClick={() => {
                    setUploadFor(viewAssignment);
                    setViewAssignment(null);
                  }}
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  {submissions[viewAssignment.id] ? "Re-submit" : "Submit"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload modal */}
      <Dialog
        open={!!uploadFor}
        onOpenChange={(v) => {
          if (!v) {
            setUploadFor(null);
            setFile(null);
          }
        }}
      >
        <DialogContent className="glass-strong max-w-md">
          <DialogTitle className="font-display">Upload Assignment</DialogTitle>
          {uploadFor && (
            <div className="space-y-4 pt-2">
              <div className="glass rounded-xl p-3">
                <div className="text-xs text-primary font-mono font-bold">
                  {uploadFor.subject_code}
                </div>
                <div className="font-medium text-sm mt-0.5">{uploadFor.title}</div>
              </div>
              <div>
                <Label htmlFor="file">Choose file (PDF, DOCX, ZIP — max 10 MB)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.zip,.rar,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-1"
                />
                {file && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Selected: {file.name} ({(file.size / 1024).toFixed(0)} KB)
                  </p>
                )}
                {submissions[uploadFor.id] && !file && (
                  <p className="text-xs text-success mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Already submitted — choose a new file to
                    replace.
                  </p>
                )}
              </div>
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full glow-button"
              >
                {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
