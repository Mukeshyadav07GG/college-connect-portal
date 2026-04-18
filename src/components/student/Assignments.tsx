import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  subject_code: string | null;
  deadline: string | null;
  file_url: string | null;
}

interface Submission { assignment_id: string; file_url: string; submitted_at: string; }

export const Assignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [uploadFor, setUploadFor] = useState<Assignment | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const [{ data: a }, { data: s }] = await Promise.all([
      supabase.from("assignments").select("*").order("deadline", { ascending: true, nullsFirst: false }),
      supabase.from("assignment_submissions").select("assignment_id,file_url,submitted_at").eq("student_id", user.id),
    ]);
    setAssignments(a ?? []);
    const map: Record<string, Submission> = {};
    (s ?? []).forEach((row: any) => { map[row.assignment_id] = row; });
    setSubmissions(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleUpload = async () => {
    if (!file || !uploadFor || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${uploadFor.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("submissions").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("assignment_submissions").upsert({
        assignment_id: uploadFor.id,
        student_id: user.id,
        file_url: path,
      }, { onConflict: "assignment_id,student_id" });
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Assignments</h1>
        <p className="text-muted-foreground text-sm">Submit your assignments before the deadline.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : assignments.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">No assignments yet</p>
          <p className="text-xs text-muted-foreground mt-1">Faculty will post assignments here</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((a, i) => {
            const sub = submissions[a.id];
            const overdue = isOverdue(a.deadline) && !sub;
            return (
              <div key={a.id} className="glass rounded-2xl p-5 hover-lift animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
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
                {a.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{a.description}</p>}
                {a.deadline && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                    <Calendar className="w-3 h-3" />
                    Due {new Date(a.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </div>
                )}
                <Button
                  size="sm"
                  className={`w-full ${sub ? "" : "glow-button"}`}
                  variant={sub ? "outline" : "default"}
                  onClick={() => setUploadFor(a)}
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {sub ? "Re-submit" : "Upload"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!uploadFor} onOpenChange={(v) => { if (!v) { setUploadFor(null); setFile(null); } }}>
        <DialogContent className="glass-strong max-w-md">
          <DialogTitle className="font-display">Upload Assignment</DialogTitle>
          {uploadFor && (
            <div className="space-y-4 pt-2">
              <div className="glass rounded-xl p-3">
                <div className="text-xs text-primary font-mono font-bold">{uploadFor.subject_code}</div>
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
              </div>
              <Button onClick={handleUpload} disabled={!file || uploading} className="w-full glow-button">
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
