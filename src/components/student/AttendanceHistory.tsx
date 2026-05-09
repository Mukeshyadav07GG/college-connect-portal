import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, TrendingUp, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, Cell,
} from "recharts";
import { SUBJECT_FULL_NAMES } from "@/data/courses";

interface Row { date: string; status: string; subject_code: string; }

interface SubjectStat {
  code: string;
  name: string;
  present: number;
  total: number;
  pct: number;
}

export const AttendanceHistory = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SubjectStat | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("attendance")
      .select("date,status,subject_code")
      .eq("student_id", user.id)
      .order("date", { ascending: false })
      .then(({ data }) => {
        setRows((data ?? []) as Row[]);
        setLoading(false);
      });
  }, [user]);

  const stats: SubjectStat[] = useMemo(() => {
    const m = new Map<string, { p: number; t: number }>();
    rows.forEach((r) => {
      const cur = m.get(r.subject_code) ?? { p: 0, t: 0 };
      cur.t++;
      if (r.status?.toLowerCase() === "present") cur.p++;
      m.set(r.subject_code, cur);
    });
    return Array.from(m.entries()).map(([code, v]) => ({
      code,
      name: SUBJECT_FULL_NAMES[code]?.name ?? code,
      present: v.p,
      total: v.t,
      pct: v.t ? (v.p / v.t) * 100 : 0,
    })).sort((a, b) => a.code.localeCompare(b.code));
  }, [rows]);

  const overall = useMemo(() => {
    const t = rows.length;
    const p = rows.filter((r) => r.status?.toLowerCase() === "present").length;
    return { p, t, pct: t ? (p / t) * 100 : 0 };
  }, [rows]);

  const colorFor = (pct: number) =>
    pct >= 75 ? "hsl(var(--success))" : pct >= 60 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="animate-slide-up">
        <h1 className="font-display text-3xl font-bold mb-1">Attendance</h1>
        <p className="text-muted-foreground text-sm">Track your subject-wise attendance and stay above 75%.</p>
      </div>

      {/* Overall card */}
      <div className="glass-strong rounded-3xl p-6 animate-scale-in flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center shadow-glow-strong">
            <CalendarCheck className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Overall attendance</div>
            <div className="font-display text-4xl font-bold gradient-text">{overall.pct.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">{overall.p} present out of {overall.t} classes</div>
          </div>
        </div>
        <div className="flex-1">
          <Progress value={overall.pct} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>0%</span>
            <span className="font-semibold text-warning">75% required</span>
            <span>100%</span>
          </div>
          {overall.pct < 75 && overall.t > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-warning animate-pulse-glow rounded-lg p-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              You're below the minimum 75% requirement.
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground animate-fade-in">Loading…</div>
      ) : stats.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center animate-fade-in">
          <CalendarCheck className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">No attendance recorded yet</p>
          <p className="text-xs text-muted-foreground mt-1">Faculty will mark attendance here.</p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="glass rounded-2xl p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="font-display font-bold">Subject-wise attendance %</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="code" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                    formatter={(v: number) => [`${v.toFixed(1)}%`, "Attendance"]}
                  />
                  <Bar dataKey="pct" radius={[8, 8, 0, 0]}>
                    {stats.map((s, i) => <Cell key={i} fill={colorFor(s.pct)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per-subject cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((s, i) => (
              <div
                key={s.code}
                className="glass rounded-2xl p-5 hover-lift hover-glow animate-slide-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-mono font-bold text-primary text-sm">{s.code}</span>
                  <Badge
                    variant="secondary"
                    style={{
                      background: `${colorFor(s.pct)}20`,
                      color: colorFor(s.pct),
                      borderColor: colorFor(s.pct),
                    }}
                    className="border"
                  >
                    {s.pct.toFixed(0)}%
                  </Badge>
                </div>
                <h3 className="font-display font-bold text-sm mb-3 line-clamp-1">{s.name}</h3>
                <Progress value={s.pct} className="h-2 mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-success" /> {s.present} present</span>
                  <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-destructive" /> {s.total - s.present} absent</span>
                </div>
              </div>
            ))}
          </div>

          {/* Recent log */}
          <div className="glass rounded-2xl p-5 animate-slide-up">
            <h2 className="font-display font-bold mb-3">Recent classes</h2>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {rows.slice(0, 30).map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg hover:bg-accent/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20">{new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    <span className="font-mono text-xs text-primary font-bold">{r.subject_code}</span>
                  </div>
                  {r.status?.toLowerCase() === "present" ? (
                    <Badge className="bg-success/15 text-success border-success/30 border">Present</Badge>
                  ) : (
                    <Badge className="bg-destructive/15 text-destructive border-destructive/30 border">Absent</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
