import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/lib/api/client";
import { TIME_SLOTS, DAYS, SUBJECT_FULL_NAMES } from "@/data/courses";
import { Clock, Coffee, Utensils } from "lucide-react";

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

export const Timetable = () => {
  const [rows, setRows] = useState<TTRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("timetable").select("day,slot,subject_code,faculty_name,room").eq("section", "CS31")
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });
  }, []);

  const lookup = (day: string, slot: number) => rows.find((r) => r.day === day && r.slot === slot);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Time Table</h1>
          <p className="text-muted-foreground text-sm">Hover any class to see subject details.</p>
        </div>

        {/* Class info */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <InfoCard label="Course" value="B.Tech VI Sem" />
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
                    <th key={i} className={`text-center text-[10px] font-semibold p-2 rounded-lg ${
                      s.slot === "break" ? "bg-warning/20 text-warning" :
                      s.slot === "lunch" ? "bg-success/20 text-success" :
                      "bg-primary/10 text-primary"
                    }`}>
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
                    <td className="font-display font-bold text-sm p-2">{day.slice(0, 3)}</td>
                    {TIME_SLOTS.map((s, idx) => {
                      if (s.slot === "break") {
                        return <td key={idx} className="bg-warning/10 rounded-lg text-center text-warning text-xs font-medium">—</td>;
                      }
                      if (s.slot === "lunch") {
                        return <td key={idx} className="bg-success/10 rounded-lg text-center text-success text-xs font-medium">—</td>;
                      }
                      const cell = lookup(day, s.slot as number);
                      if (!cell?.subject_code) {
                        return <td key={idx} className="bg-muted/30 rounded-lg text-center text-muted-foreground text-xs">Free</td>;
                      }
                      const subj = SUBJECT_FULL_NAMES[cell.subject_code];
                      return (
                        <td key={idx} className="p-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className={`w-full h-full p-2 rounded-lg bg-gradient-to-br ${SUBJECT_COLORS[cell.subject_code] ?? "from-primary to-secondary"} text-white text-xs font-bold hover:scale-105 hover:shadow-glow transition-all`}>
                                {cell.subject_code}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="glass-strong p-3 max-w-xs">
                              <div className="font-display font-bold text-sm mb-1">{subj?.name ?? cell.subject_code}</div>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <div><span className="text-foreground/60">Faculty:</span> {cell.faculty_name}</div>
                                <div><span className="text-foreground/60">Room:</span> {cell.room}</div>
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
        <div className="glass rounded-2xl p-4">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Subject Legend</h3>
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
    </TooltipProvider>
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="glass rounded-xl p-3">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="font-display font-bold text-sm mt-0.5">{value}</div>
  </div>
);
