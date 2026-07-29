import { useEffect, useState } from "react";
import { Megaphone, Calendar } from "lucide-react";
import { supabase } from "@/lib/api/client";

interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string | null;
  created_at: string;
}

export const Announcements = () => {
  const [list, setList] = useState<Announcement[]>([]);

  useEffect(() => {
    supabase.from("announcements").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setList(data ?? []));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-1">Announcements</h1>
        <p className="text-muted-foreground text-sm">Stay updated with the latest from the institute.</p>
      </div>

      {list.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Megaphone className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((a, i) => (
            <article key={a.id} className="glass rounded-2xl p-5 hover-lift animate-slide-up flex gap-4" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 shadow-glow">
                <Megaphone className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-display font-bold">{a.title}</h3>
                  {a.category && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{a.category}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{a.body}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
