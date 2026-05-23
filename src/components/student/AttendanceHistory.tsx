import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CalendarCheck, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
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
  trend: number; // delta in percentage points: last 7 days vs previous 7 days
}

const BLINK_PREF_KEY = "attendance.blinkAlerts";

export const AttendanceHistory = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SubjectStat | null>(null);
  const [blinkEnabled, setBlinkEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem(BLINK_PREF_KEY);
    return v === null ? true : v === "true";
  });

  useEffect(() => {
    localStorage.setItem(BLINK_PREF_KEY, String(blinkEnabled));
  }, [blinkEnabled]);

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
    const now = Date.now();
    const day = 86400000;
    const window1Start = now - 7 * day;   // last 7 days [t-7, now]
    const window2Start = now - 14 * day;  // previous 7 days [t-14, t-7]

    type Acc = { p: number; t: number; w1p: number; w1t: number; w2p: number; w2t: number };
    const m = new Map<string, Acc>();
    rows.forEach((r) => {
      const cur = m.get(r.subject_code) ?? { p: 0, t: 0, w1p: 0, w1t: 0, w2p: 0, w2t: 0 };
      cur.t++;
      const isPresent = r.status?.toLowerCase() === "present";
      if (isPresent) cur.p++;
      const ts = new Date(r.date).getTime();
      if (ts >= window1Start) {
        cur.w1t++;
        if (isPresent) cur.w1p++;
      } else if (ts >= window2Start) {
        cur.w2t++;
        if (isPresent) cur.w2p++;
      }
      m.set(r.subject_code, cur);
    });
    return Array.from(m.entries()).map(([code, v]) => {
      const w1pct = v.w1t ? (v.w1p / v.w1t) * 100 : null;
      const w2pct = v.w2t ? (v.w2p / v.w2t) * 100 : null;
      const trend = w1pct !== null && w2pct !== null ? w1pct - w2pct : 0;
      return {
        code,
        name: SUBJECT_FULL_NAMES[code]?.name ?? code,
        present: v.p,
        total: v.t,
        pct: v.t ? (v.p / v.t) * 100 : 0,
        trend,
      };
    }).sort((a, b) => a.code.localeCompare(b.code));
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
      <div className="animate-slide-up flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Attendance</h1>
          <p className="text-muted-foreground text-sm">Track your subject-wise attendance and stay above 75%.</p>
        </div>
        <div className="glass rounded-xl px-3 py-2 flex items-center gap-2.5">
          <Switch
            id="blink-toggle"
            checked={blinkEnabled}
            onCheckedChange={setBlinkEnabled}
            aria-label="Toggle blinking alert animations"
          />
          <Label htmlFor="blink-toggle" className="text-xs cursor-pointer">
            Blinking alerts
            <span className="block text-[10px] text-muted-foreground font-normal">For accessibility</span>
          </Label>
        </div>
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
            <div className={`mt-3 flex items-center gap-1.5 text-xs text-warning rounded-lg p-2 ${blinkEnabled ? "animate-pulse-glow" : ""}`}>
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
            {stats.map((s, i) => {
              const alert =
                s.pct < 50 ? { cls: "blink-critical", text: "Critical! Far below 75%. Immediate action needed.", tone: "text-destructive" } :
                s.pct < 60 ? { cls: "blink-danger",   text: "Danger: attendance is very low.",                  tone: "text-destructive" } :
                s.pct < 70 ? { cls: "blink-warn",     text: "Warning: well below 75% requirement.",            tone: "text-warning" } :
                s.pct < 75 ? { cls: "blink-notice",   text: "Notice: just below 75% — attend more classes.",   tone: "text-warning" } :
                null;

              const trendAbs = Math.abs(s.trend);
              const trendInfo =
                trendAbs < 1 ? { Icon: Minus,         cls: "text-muted-foreground", label: "Steady" } :
                s.trend > 0  ? { Icon: TrendingUp,    cls: "text-success",          label: "Improving" } :
                               { Icon: TrendingDown,  cls: "text-destructive",      label: "Declining" };

              return (
              <button
                type="button"
                key={s.code}
                onClick={() => setSelected(s)}
                className={`glass rounded-2xl p-5 hover-lift hover-glow animate-slide-up text-left w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 ${blinkEnabled && alert?.cls ? alert.cls : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-sm line-clamp-1">{s.name}</h3>
                    <span className="font-mono font-bold text-primary text-xs">{s.code}</span>
                  </div>
                  <Badge
                    variant="secondary"
                    style={{
                      background: `${colorFor(s.pct)}20`,
                      color: colorFor(s.pct),
                      borderColor: colorFor(s.pct),
                    }}
                    className="border shrink-0"
                  >
                    {s.pct.toFixed(0)}%
                  </Badge>
                </div>
                <Progress value={s.pct} className="h-2 mb-2 mt-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-success" /> {s.present} present</span>
                  <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-destructive" /> {s.total - s.present} absent</span>
                </div>

                {/* Trend indicator */}
                <div
                  className={`mt-2 flex items-center gap-1.5 text-[11px] font-medium ${trendInfo.cls}`}
                  title="Last 7 days vs previous 7 days"
                >
                  <trendInfo.Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {trendInfo.label}
                    {trendAbs >= 1 && ` ${s.trend > 0 ? "+" : ""}${s.trend.toFixed(1)} pts`}
                    <span className="text-muted-foreground font-normal"> · week over week</span>
                  </span>
                </div>

                {alert && (
                  <div
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => { e.stopPropagation(); setSelected(s); }}
                    className={`mt-3 flex items-center gap-1.5 text-[11px] font-medium rounded-lg px-2 py-1.5 hover:bg-accent/40 cursor-pointer ${alert.tone}`}
                    aria-label={`Open ${s.code} attendance details`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span className="line-clamp-2">{alert.text}</span>
                  </div>
                )}
              </button>
              );
            })}
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

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (() => {
            const subjectRows = rows.filter((r) => r.subject_code === selected.code);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span className="font-mono text-primary">{selected.code}</span>
                    <span className="text-base font-normal text-muted-foreground line-clamp-1">{selected.name}</span>
                  </DialogTitle>
                  <DialogDescription>Subject-wise attendance details</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="glass rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Attendance</span>
                      <Badge
                        style={{
                          background: `${colorFor(selected.pct)}20`,
                          color: colorFor(selected.pct),
                          borderColor: colorFor(selected.pct),
                        }}
                        className="border"
                      >
                        {selected.pct.toFixed(1)}%
                      </Badge>
                    </div>
                    <Progress value={selected.pct} className="h-2 mb-3" />
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-success/10 p-2">
                        <div className="font-bold text-success text-lg">{selected.present}</div>
                        <div className="text-muted-foreground">Present</div>
                      </div>
                      <div className="rounded-lg bg-destructive/10 p-2">
                        <div className="font-bold text-destructive text-lg">{selected.total - selected.present}</div>
                        <div className="text-muted-foreground">Absent</div>
                      </div>
                      <div className="rounded-lg bg-primary/10 p-2">
                        <div className="font-bold text-primary text-lg">{selected.total}</div>
                        <div className="text-muted-foreground">Total</div>
                      </div>
                    </div>
                    {selected.pct < 75 && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-warning">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Below 75% — attend more classes to recover.
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-display font-bold text-sm mb-2">Class history</h3>
                    <div className="space-y-1 max-h-72 overflow-y-auto">
                      {subjectRows.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No classes recorded.</p>
                      ) : subjectRows.map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg hover:bg-accent/40">
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          {r.status?.toLowerCase() === "present" ? (
                            <Badge className="bg-success/15 text-success border-success/30 border">Present</Badge>
                          ) : (
                            <Badge className="bg-destructive/15 text-destructive border-destructive/30 border">Absent</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
