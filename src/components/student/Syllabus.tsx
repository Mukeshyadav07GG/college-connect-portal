import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Subject {
  id: string;
  code: string;
  name: string;
  faculty_name: string | null;
  units: string[];
  completion: number;
}

export const Syllabus = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [open, setOpen] = useState<Subject | null>(null);

  useEffect(() => {
    supabase.from("subjects").select("*").eq("semester", "VI").order("code")
      .then(({ data }) => setSubjects((data ?? []).map((s: any) => ({ ...s, units: s.units ?? [] }))));
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Syllabus</h1>
        <p className="text-muted-foreground text-sm">Track unit completion for each subject.</p>
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
        <DialogContent className="glass-strong max-w-lg">
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

              <div className="mt-4">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">5 Units</h4>
                <div className="space-y-2">
                  {open.units.map((u, i) => {
                    const done = (i + 1) / open.units.length * 100 <= open.completion;
                    return (
                      <div key={i} className="glass rounded-xl p-3 flex items-center gap-3">
                        {done ? (
                          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="text-[10px] text-muted-foreground">UNIT {i + 1}</div>
                          <div className="text-sm font-medium">{u}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
