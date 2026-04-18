import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, Users } from "lucide-react";
import { toast } from "sonner";

interface Assignment {
  id: string;
  title: string;
  subject_code: string | null;
  deadline: string | null;
  created_at: string;
}

interface Submission {
  id: string;
  student_id: string;
  file_url: string;
  submitted_at: string;
  student_name?: string;
  student_roll?: string;
}

export const SubmissionsViewer = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState<Assignment | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: a } = await supabase.from("assignments").select("*").order("created_at", { ascending: false });
      setAssignments(a ?? []);
      const { data: s } = await supabase.from("assignment_submissions").select("assignment_id");
      const c: Record<string, number> = {};
      (s ?? []).forEach((row: any) => { c[row.assignment_id] = (c[row.assignment_id] ?? 0) + 1; });
      setCounts(c);
      setLoading(false);
    })();
  }, []);

  const openSubs = async (a: Assignment) => {
    setOpen(a);
    setSubs([]);
    const { data } = await supabase
      .from("assignment_submissions")
      .select("id, student_id, file_url, submitted_at")
      .eq("assignment_id", a.id)
      .order("submitted_at", { ascending: false });
    const rows = (data ?? []) as Submission[];
    if (rows.length) {
      const ids = rows.map((r) => r.student_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, roll_number")
        .in("user_id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      rows.forEach((r) => {
        const p = map.get(r.student_id);
        r.student_name = p?.full_name;
        r.student_roll = p?.roll_number;
      });
    }
    setSubs(rows);
  };

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("submissions").createSignedUrl(path, 60);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Submissions</h1>
        <p className="text-muted-foreground">View student submissions per assignment</p>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading…</p>
      ) : assignments.length === 0 ? (
        <Card className="glass-card p-8 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
          <p>No assignments created yet.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {assignments.map((a) => (
            <Card key={a.id} className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.subject_code} · Due {a.deadline ? new Date(a.deadline).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Users className="h-4 w-4 text-primary" />
                  {counts[a.id] ?? 0} submitted
                </span>
                <Button size="sm" variant="outline" onClick={() => openSubs(a)}>View</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="glass-card max-w-2xl">
          <DialogHeader>
            <DialogTitle>{open?.title}</DialogTitle>
          </DialogHeader>
          {subs.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No submissions yet.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {subs.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/40">
                  <div>
                    <p className="font-medium text-sm">{s.student_name ?? s.student_id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.student_roll && `${s.student_roll} · `}
                      {new Date(s.submitted_at).toLocaleString()}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => download(s.file_url)}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
