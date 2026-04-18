import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BarChart3, ChevronRight, Trophy, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SUBJECT_FULL_NAMES } from "@/data/courses";

type ExamType = "sessional1" | "sessional2" | "put" | "semester";

interface ResultRow {
  subject_code: string;
  exam_type: ExamType;
  marks: number;
  max_marks: number;
}

const EXAM_META: Record<ExamType, { label: string; desc: string; gradient: string }> = {
  sessional1: { label: "Sessional 1", desc: "First mid-semester exam", gradient: "from-blue-500 to-cyan-500" },
  sessional2: { label: "Sessional 2", desc: "Second mid-semester exam", gradient: "from-purple-500 to-pink-500" },
  put: { label: "PUT", desc: "Pre-University Test", gradient: "from-indigo-500 to-purple-500" },
  semester: { label: "Semester", desc: "Final semester exam", gradient: "from-fuchsia-500 to-rose-500" },
};

export const Result = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [step1Open, setStep1Open] = useState(false);
  const [step2Open, setStep2Open] = useState<ExamType | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("results").select("subject_code,exam_type,marks,max_marks").eq("student_id", user.id)
      .then(({ data }) => setResults((data ?? []) as ResultRow[]));
  }, [user]);

  const byType = (t: ExamType) => results.filter((r) => r.exam_type === t);
  const totalForType = (t: ExamType) => {
    const rows = byType(t);
    if (rows.length === 0) return null;
    const got = rows.reduce((s, r) => s + Number(r.marks), 0);
    const max = rows.reduce((s, r) => s + Number(r.max_marks), 0);
    return { got, max, pct: max ? (got / max) * 100 : 0 };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Result</h1>
        <p className="text-muted-foreground text-sm">View your performance across all examinations.</p>
      </div>

      {results.length === 0 && (
        <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
          No results published yet. Faculty will upload marks here as they're released.
        </div>
      )}

      <button
        onClick={() => setStep1Open(true)}
        className="glass rounded-3xl p-7 hover-lift hover-glow w-full text-left group flex items-center gap-5"
      >
        <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center shadow-glow-strong group-hover:scale-110 transition-transform">
          <Trophy className="w-7 h-7 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-xl font-bold mb-1">Open Result Dashboard</h3>
          <p className="text-sm text-muted-foreground">View Sessional 1, Sessional 2, PUT and Semester marks</p>
        </div>
        <ChevronRight className="w-6 h-6 text-primary group-hover:translate-x-1 transition-transform" />
      </button>

      {/* Step 1 — 4 boxes */}
      <Dialog open={step1Open} onOpenChange={setStep1Open}>
        <DialogContent className="glass-strong max-w-2xl">
          <DialogTitle className="font-display text-xl">Examination Results</DialogTitle>
          <div className="grid sm:grid-cols-2 gap-3 mt-2">
            {(Object.keys(EXAM_META) as ExamType[]).map((t) => {
              const total = totalForType(t);
              return (
                <button
                  key={t}
                  onClick={() => { setStep1Open(false); setTimeout(() => setStep2Open(t), 150); }}
                  className="glass rounded-2xl p-5 text-left hover-lift hover-glow group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${EXAM_META[t].gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md`}>
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-display font-bold">{EXAM_META[t].label}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{EXAM_META[t].desc}</p>
                  {total ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-display font-bold gradient-text">{total.pct.toFixed(0)}%</span>
                      <span className="text-xs text-muted-foreground">avg</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not declared</span>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 2 — detail with chart */}
      <Dialog open={!!step2Open} onOpenChange={(v) => !v && setStep2Open(null)}>
        <DialogContent className="glass-strong max-w-2xl">
          {step2Open && (
            <>
              <DialogTitle className="font-display text-xl flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                {EXAM_META[step2Open].label} — Marks
              </DialogTitle>

              {byType(step2Open).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No marks declared for this exam yet.</div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {(() => {
                      const t = totalForType(step2Open)!;
                      return (
                        <>
                          <Stat label="Marks Obtained" value={`${t.got}`} />
                          <Stat label="Out of" value={`${t.max}`} />
                          <Stat label="Percentage" value={`${t.pct.toFixed(1)}%`} highlight />
                        </>
                      );
                    })()}
                  </div>

                  <div className="glass rounded-2xl p-4 mt-3">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Subject-wise breakdown</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byType(step2Open).map((r) => ({
                          name: r.subject_code,
                          marks: Number(r.marks),
                          max: Number(r.max_marks),
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <RTooltip
                            contentStyle={{
                              background: "hsl(var(--popover))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "0.75rem",
                              fontSize: "12px",
                            }}
                          />
                          <Bar dataKey="marks" fill="url(#gradMarks)" radius={[8, 8, 0, 0]} />
                          <defs>
                            <linearGradient id="gradMarks" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" />
                              <stop offset="100%" stopColor="hsl(var(--secondary))" />
                            </linearGradient>
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-2">
                    {byType(step2Open).map((r) => (
                      <div key={r.subject_code} className="flex items-center justify-between text-sm glass rounded-lg px-3 py-2">
                        <div>
                          <span className="font-mono font-bold text-primary">{r.subject_code}</span>
                          <span className="text-muted-foreground ml-2">{SUBJECT_FULL_NAMES[r.subject_code]?.name}</span>
                        </div>
                        <span className="font-display font-bold">{r.marks} / {r.max_marks}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Stat = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="glass rounded-xl p-3 text-center">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className={`font-display font-bold text-lg mt-0.5 ${highlight ? "gradient-text" : ""}`}>{value}</div>
  </div>
);
