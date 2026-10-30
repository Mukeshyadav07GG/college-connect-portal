import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BarChart3, ChevronRight, Trophy, TrendingUp, Award, Target, Sparkles } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SUBJECT_FULL_NAMES } from "@/data/courses";
import { Progress } from "@/components/ui/progress";
import { normExam } from "@/lib/semesters";

type ExamType = "Sessional 1" | "Sessional 2" | "PUT" | "Semester";
const EXAM_ORDER: ExamType[] = ["Sessional 1", "Sessional 2", "PUT", "Semester"];

interface ResultRow { subject_code: string; exam_type: string; marks: number; max_marks: number; }

const EXAM_META: Record<ExamType, { label: string; desc: string; gradient: string }> = {
  "Sessional 1": { label: "Sessional 1", desc: "First mid-semester exam", gradient: "from-blue-500 to-cyan-500" },
  "Sessional 2": { label: "Sessional 2", desc: "Second mid-semester exam", gradient: "from-purple-500 to-pink-500" },
  "PUT": { label: "PUT", desc: "Pre-University Test", gradient: "from-indigo-500 to-purple-500" },
  "Semester": { label: "Semester", desc: "Final semester exam", gradient: "from-fuchsia-500 to-rose-500" },
};

export const Result = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [detail, setDetail] = useState<ExamType | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    supabase.from("results").select("subject_code,exam_type,marks,max_marks").eq("student_id", user.id)
      .then(({ data }) => setResults(((data ?? []) as ResultRow[]).map((r) => ({ ...r, exam_type: normExam(r.exam_type) }))));
    supabase.from("subjects").select("code,name").then(({ data }) => {
      const m: Record<string, string> = {};
      (data ?? []).forEach((s: any) => { m[s.code] = s.name; });
      setNames(m);
    });
  }, [user]);

  const byType = (t: ExamType) => results.filter((r) => r.exam_type === t);
  const totalForType = (t: ExamType) => {
    const rows = byType(t);
    if (rows.length === 0) return null;
    const got = rows.reduce((s, r) => s + Number(r.marks), 0);
    const max = rows.reduce((s, r) => s + Number(r.max_marks), 0);
    return { got, max, pct: max ? (got / max) * 100 : 0 };
  };

  // Trend (avg % per exam type)
  const trend = useMemo(() => EXAM_ORDER.map((t) => {
    const tot = totalForType(t);
    return { exam: t, pct: tot ? Number(tot.pct.toFixed(1)) : null };
  }).filter((d) => d.pct !== null), [results]);

  // Radar (per-subject % across all exams)
  const radar = useMemo(() => {
    const m = new Map<string, { got: number; max: number }>();
    results.forEach((r) => {
      const cur = m.get(r.subject_code) ?? { got: 0, max: 0 };
      cur.got += Number(r.marks); cur.max += Number(r.max_marks);
      m.set(r.subject_code, cur);
    });
    return Array.from(m.entries()).map(([code, v]) => ({
      subject: code,
      pct: v.max ? Number(((v.got / v.max) * 100).toFixed(1)) : 0,
    }));
  }, [results]);

  const overall = useMemo(() => {
    const got = results.reduce((s, r) => s + Number(r.marks), 0);
    const max = results.reduce((s, r) => s + Number(r.max_marks), 0);
    return { got, max, pct: max ? (got / max) * 100 : 0 };
  }, [results]);

  const grade = (p: number) => p >= 90 ? "A+" : p >= 80 ? "A" : p >= 70 ? "B+" : p >= 60 ? "B" : p >= 50 ? "C" : p >= 40 ? "D" : "F";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="animate-slide-up">
        <h1 className="font-display text-3xl font-bold mb-1">Result</h1>
        <p className="text-muted-foreground text-sm">Track your performance across exams.</p>
      </div>

      {results.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center animate-fade-in">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">No results published yet</p>
          <p className="text-xs text-muted-foreground mt-1">Faculty will upload marks here as they're released.</p>
        </div>
      ) : (
        <>
          {/* Hero summary */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="glass-strong rounded-3xl p-6 animate-scale-in sm:col-span-1 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-primary/20 blur-2xl" />
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center shadow-glow-strong mb-3">
                  <Award className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Overall</div>
                <div className="font-display text-5xl font-bold gradient-text leading-none mt-1">{overall.pct.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground mt-1">{overall.got} / {overall.max} marks</div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  <Sparkles className="w-3 h-3" /> Grade {grade(overall.pct)}
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-5 sm:col-span-2 animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="font-display font-bold text-sm">Performance trend</h2>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="exam" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <RTooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: "12px" }}
                      formatter={(v: number) => [`${v}%`, "Average"]}
                    />
                    <Line type="monotone" dataKey="pct" stroke="hsl(var(--primary))" strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", r: 5 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Per-exam cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {EXAM_ORDER.map((t, i) => {
              const total = totalForType(t);
              return (
                <button
                  key={t}
                  onClick={() => setDetail(t)}
                  className="glass rounded-2xl p-5 text-left hover-lift hover-glow group animate-slide-up disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${EXAM_META[t].gradient} flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-md`}>
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-display font-bold text-sm">{EXAM_META[t].label}</h4>
                  <p className="text-[11px] text-muted-foreground mb-2">{EXAM_META[t].desc}</p>
                  {total ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-display font-bold gradient-text">{total.pct.toFixed(0)}%</span>
                        <span className="text-[10px] text-muted-foreground">avg</span>
                      </div>
                      <Progress value={total.pct} className="h-1.5 mt-2" />
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not declared</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Radar — subject mastery */}
          {radar.length >= 3 && (
            <div className="glass rounded-2xl p-5 animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary" />
                <h2 className="font-display font-bold text-sm">Subject mastery</h2>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radar}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Radar dataKey="pct" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    <RTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: "12px" }} formatter={(v: number) => [`${v}%`, "Score"]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="glass-strong max-w-2xl animate-scale-in">
          {detail && (
            <>
              <DialogTitle className="font-display text-xl flex items-center gap-2">
                <ChevronRight className="w-5 h-5 text-primary" />
                {EXAM_META[detail].label} — Marks
              </DialogTitle>

              {byType(detail).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">Is exam ke marks abhi faculty ne upload nahi kiye hain.</div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {(() => {
                      const t = totalForType(detail)!;
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
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Subject-wise</h4>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={byType(detail).map((r) => ({
                          name: r.subject_code, marks: Number(r.marks), max: Number(r.max_marks),
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <RTooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: "12px" }} />
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

                  <div className="space-y-1.5 mt-2 max-h-48 overflow-y-auto">
                    {byType(detail).map((r) => (
                      <div key={r.subject_code} className="flex items-center justify-between text-sm glass rounded-lg px-3 py-2">
                        <div>
                          <span className="font-mono font-bold text-primary">{r.subject_code}</span>
                          <span className="text-muted-foreground ml-2 hidden sm:inline">{names[r.subject_code] ?? SUBJECT_FULL_NAMES[r.subject_code]?.name}</span>
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
  <div className="glass rounded-xl p-3 text-center animate-scale-in">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className={`font-display font-bold text-lg mt-0.5 ${highlight ? "gradient-text" : ""}`}>{value}</div>
  </div>
);
