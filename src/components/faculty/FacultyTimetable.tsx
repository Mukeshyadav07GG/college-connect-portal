import { useEffect, useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TIME_SLOTS, DAYS, SUBJECT_FULL_NAMES } from "@/data/courses";
import { Clock, Coffee, Utensils, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SEMESTERS, semLabel } from "@/lib/semesters";

interface TTRow {
  day: string;
  slot: number;
  subject_code: string | null;
  faculty_name: string | null;
  room: string | null;
}

const SUBJECT_COLORS: Record<string, string> = {
  CN: "from-blue-500 to-blue-600",
  CD: "from-purple-500 to-purple-600",
  SE: "from-pink-500 to-pink-600",
  DC: "from-indigo-500 to-indigo-600",
  SPM: "from-cyan-500 to-cyan-600",
  EITK: "from-violet-500 to-violet-600",
  PDP: "from-fuchsia-500 to-fuchsia-600",
};

// Normalize names so "Mr. Nikhil Tyagi" == "nikhil tyagi"
const norm = (s?: string | null) =>
  (s ?? "").toLowerCase().replace(/^(mr|mrs|ms|dr|prof)\.?\s+/i, "").replace(/\s+/g, " ").trim();

export const FacultyTimetable = () => {
  const { profile } = useAuth();
  const [rows, setRows] = useState<TTRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyMine, setOnlyMine] = useState(false);
  const [sem, setSem] = useState<string>("VI");

  const myName = norm(profile?.full_name);

  useEffect(() => {
    supabase
      .from("timetable")
      .select("day,slot,subject_code,faculty_name,room")
      .eq("semester", sem)
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });
  }, [sem]);

  const isMine = (faculty?: string | null) => !!myName && norm(faculty) === myName;

  const lookup = (day: string, slot: number) => rows.find((r) => r.day === day && r.slot === slot);

  const myCount = useMemo(() => rows.filter((r) => isMine(r.faculty_name)).length, [rows, myName]);

  // Detect current ongoing slot (best-effort using TIME_SLOTS time labels like "9:00-9:50")
  const now = new Date();
  const todayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];
  const todayFull = DAYS.find((d) => d.startsWith(todayName));
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const isOngoing = (slotIdx: number, day: string) => {
    if (day !== todayFull) return false;
    const t = TIME_SLOTS[slotIdx]?.time as string | undefined;
    if (!t || !t.includes("-")) return false;
    const [a, b] = t.split("-").map((x) => x.trim());
    const toMin = (s: string) => {
      const [h, m] = s.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    return nowMins >= toMin(a) && nowMins <= toMin(b);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1">Time Table</h1>
            <p className="text-muted-foreground text-sm">
              Full schedule — your classes are highlighted.
              {myName && <> You have <strong>{myCount}</strong> class{myCount === 1 ? "" : "es"} this week.</>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={sem} onChange={(e) => setSem(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              {SEMESTERS.map((x) => <option key={x} value={x}>{semLabel(x)}</option>)}
            </select>
            <Button
              size="sm"
              variant={!onlyMine ? "default" : "outline"}
              onClick={() => setOnlyMine(false)}
            >
              Show All
            </Button>
            <Button
              size="sm"
              variant={onlyMine ? "default" : "outline"}
              onClick={() => setOnlyMine(true)}
            >
              <Star className="w-3.5 h-3.5 mr-1" /> Only My Classes
            </Button>
          </div>
        </div>

        {/* Class info */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <InfoCard label="Course" value={`B.Tech ${sem} Sem`} />
          <InfoCard label="Section" value="CS31" />
          <InfoCard label="Room" value="G26" />
          <InfoCard label="Coordinator" value="Mr. Nikhil Tyagi" />
          <InfoCard label="Deputy" value="Ms. Aditi Gautam" />
        </div>

        {/* Grid */}
        <div className="glass rounded-3xl p-3 md:p-5 overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading timetable...</div>
          ) : (
            <table className="w-full min-w-[1000px] border-separate border-spacing-1.5">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-2 w-24">Day</th>
                  {TIME_SLOTS.map((s, i) => (
                    <th
                      key={i}
                      className={`text-center text-[10px] font-semibold p-2 rounded-lg ${
                        s.slot === "break"
                          ? "bg-warning/20 text-warning"
                          : s.slot === "lunch"
                          ? "bg-success/20 text-success"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {s.slot === "break" && <Coffee className="w-3 h-3" />}
                        {s.slot === "lunch" && <Utensils className="w-3 h-3" />}
                        {typeof s.slot === "number" && <Clock className="w-3 h-3" />}
                        {s.label}
                      </div>
                      <div className="text-[9px] opacity-70 mt-0.5">{s.time}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day}>
                    <td className="font-display font-bold text-sm p-2">
                      {day.slice(0, 3)}
                      {day === todayFull && (
                        <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0">Today</Badge>
                      )}
                    </td>
                    {TIME_SLOTS.map((s, idx) => {
                      if (s.slot === "break") {
                        return (
                          <td key={idx} className="bg-warning/10 rounded-lg text-center text-warning text-xs font-medium">
                            —
                          </td>
                        );
                      }
                      if (s.slot === "lunch") {
                        return (
                          <td key={idx} className="bg-success/10 rounded-lg text-center text-success text-xs font-medium">
                            —
                          </td>
                        );
                      }
                      const cell = lookup(day, s.slot as number);
                      if (!cell?.subject_code) {
                        return (
                          <td key={idx} className="bg-muted/30 rounded-lg text-center text-muted-foreground text-xs">
                            Free
                          </td>
                        );
                      }
                      const mine = isMine(cell.faculty_name);
                      const ongoing = isOngoing(idx, day);

                      // "Only My Classes" filter — dim non-mine cells
                      if (onlyMine && !mine) {
                        return (
                          <td key={idx} className="bg-muted/20 rounded-lg text-center text-muted-foreground/40 text-xs">
                            ·
                          </td>
                        );
                      }

                      const subj = SUBJECT_FULL_NAMES[cell.subject_code];
                      const baseGradient = SUBJECT_COLORS[cell.subject_code] ?? "from-primary to-secondary";

                      return (
                        <td key={idx} className="p-0 relative">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className={`relative w-full h-full p-2 rounded-lg text-xs font-bold transition-all hover:scale-105 ${
                                  mine
                                    ? `bg-gradient-to-br ${baseGradient} text-white ring-2 ring-primary ring-offset-2 ring-offset-background shadow-glow`
                                    : `bg-gradient-to-br ${baseGradient} text-white/90 opacity-70 hover:opacity-100`
                                } ${ongoing ? "animate-pulse" : ""}`}
                              >
                                {mine && (
                                  <Star className="absolute top-0.5 right-0.5 w-3 h-3 fill-yellow-300 text-yellow-300" />
                                )}
                                <div>{cell.subject_code}</div>
                                {mine && (
                                  <div className="text-[8px] font-normal mt-0.5 opacity-90">Your Class</div>
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="glass-strong p-3 max-w-xs">
                              <div className="font-display font-bold text-sm mb-1">
                                {subj?.name ?? cell.subject_code}
                              </div>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <div>
                                  <span className="text-foreground/60">Faculty:</span> {cell.faculty_name}
                                </div>
                                <div>
                                  <span className="text-foreground/60">Room:</span> {cell.room}
                                </div>
                                {mine && (
                                  <div className="text-primary font-semibold pt-1">⭐ Your Class</div>
                                )}
                                {ongoing && (
                                  <div className="text-success font-semibold">● Ongoing now</div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Legend */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-primary to-secondary ring-2 ring-primary" />
              <span>Your Class (highlighted)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-primary to-secondary opacity-70" />
              <span>Other Faculty</span>
            </div>
          </div>
          <div>
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Subject Legend</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SUBJECT_FULL_NAMES).map(([code, info]) => (
                <div key={code} className="flex items-center gap-2 text-xs">
                  <div className={`w-4 h-4 rounded bg-gradient-to-br ${SUBJECT_COLORS[code]}`} />
                  <span className="font-mono font-bold">{code}</span>
                  <span className="text-muted-foreground">{info.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="glass rounded-xl p-3">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="font-display font-bold text-sm mt-0.5">{value}</div>
  </div>
);
