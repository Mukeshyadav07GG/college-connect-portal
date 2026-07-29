import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Users, GraduationCap, FileText, Megaphone, BookOpen, Calendar, ClipboardCheck, Award } from "lucide-react";

type Audience = "admin" | "faculty";

interface StatItem { label: string; value: number; icon: ReactNode; color: string; }

export const StatsOverview = ({ audience, name }: { audience: Audience; name?: string }) => {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const queries = audience === "admin"
        ? [
            supabase.from("profiles").select("user_id", { count: "exact", head: true }),
            supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "student"),
            supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "faculty"),
            supabase.from("subjects").select("id", { count: "exact", head: true }),
            supabase.from("assignments").select("id", { count: "exact", head: true }),
            supabase.from("announcements").select("id", { count: "exact", head: true }),
            supabase.from("events").select("id", { count: "exact", head: true }),
            supabase.from("hostel_images").select("id", { count: "exact", head: true }),
          ]
        : [
            supabase.from("assignments").select("id", { count: "exact", head: true }),
            supabase.from("assignment_submissions").select("id", { count: "exact", head: true }),
            supabase.from("results").select("id", { count: "exact", head: true }),
            supabase.from("attendance").select("id", { count: "exact", head: true }),
          ];
      const results = await Promise.all(queries);
      const counts = results.map((r) => r.count ?? 0);

      if (audience === "admin") {
        setStats([
          { label: "Total Users", value: counts[0], icon: <Users className="h-5 w-5" />, color: "from-blue-500 to-cyan-500" },
          { label: "Students", value: counts[1], icon: <GraduationCap className="h-5 w-5" />, color: "from-purple-500 to-pink-500" },
          { label: "Faculty", value: counts[2], icon: <Users className="h-5 w-5" />, color: "from-emerald-500 to-teal-500" },
          { label: "Subjects", value: counts[3], icon: <BookOpen className="h-5 w-5" />, color: "from-orange-500 to-red-500" },
          { label: "Assignments", value: counts[4], icon: <FileText className="h-5 w-5" />, color: "from-indigo-500 to-purple-500" },
          { label: "Announcements", value: counts[5], icon: <Megaphone className="h-5 w-5" />, color: "from-pink-500 to-rose-500" },
          { label: "Events", value: counts[6], icon: <Calendar className="h-5 w-5" />, color: "from-cyan-500 to-blue-500" },
          { label: "Hostel Images", value: counts[7], icon: <BookOpen className="h-5 w-5" />, color: "from-amber-500 to-orange-500" },
        ]);
      } else {
        setStats([
          { label: "Assignments Created", value: counts[0], icon: <FileText className="h-5 w-5" />, color: "from-indigo-500 to-purple-500" },
          { label: "Total Submissions", value: counts[1], icon: <ClipboardCheck className="h-5 w-5" />, color: "from-emerald-500 to-teal-500" },
          { label: "Results Uploaded", value: counts[2], icon: <Award className="h-5 w-5" />, color: "from-amber-500 to-orange-500" },
          { label: "Attendance Records", value: counts[3], icon: <Users className="h-5 w-5" />, color: "from-blue-500 to-cyan-500" },
        ]);
      }
      setLoading(false);
    })();
  }, [audience]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{audience === "admin" ? "Admin Dashboard" : "Faculty Dashboard"}</h1>
        <p className="text-muted-foreground">Welcome back{name ? `, ${name}` : ""}</p>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading stats…</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <Card key={s.label} className="glass-card p-4 hover:scale-[1.02] transition">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-3 shadow-lg`}>
                {s.icon}
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
