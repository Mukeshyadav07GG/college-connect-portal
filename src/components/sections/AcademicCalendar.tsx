import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, MapPin, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  category: string | null;
}

export const AcademicCalendar = ({ embedded = false }: { embedded?: boolean }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState<Event | null>(null);

  useEffect(() => {
    supabase.from("events").select("*").order("event_date", { ascending: true })
      .then(({ data }) => setEvents(data ?? []));
  }, []);

  const Wrapper = embedded ? "div" : "section";

  return (
    <Wrapper id={embedded ? undefined : "calendar"} className={embedded ? "" : "py-24 relative"}>
      <div className={embedded ? "" : "container"}>
        {!embedded && (
          <div className="text-center mb-14">
            <div className="inline-block glass px-4 py-1 rounded-full text-xs font-medium text-primary mb-4">ACADEMIC CALENDAR</div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Stay <span className="gradient-text">on schedule</span>
            </h2>
          </div>
        )}

        <div className="glass rounded-3xl p-5 md:p-7">
          {events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No events scheduled</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {events.map((e, i) => (
                <button
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className="text-left glass rounded-2xl p-4 hover-lift hover-glow animate-slide-up group"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-center gap-2 text-xs text-primary font-semibold mb-2">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(e.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  <div className="font-display font-bold mb-1 group-hover:text-primary transition-colors">{e.title}</div>
                  {e.category && (
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {e.category}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="glass-strong max-w-md">
          {selected && (
            <>
              <DialogTitle className="font-display text-xl">{selected.title}</DialogTitle>
              <DialogDescription className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Calendar className="w-4 h-4 text-primary" />
                  {new Date(selected.event_date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </div>
                {selected.location && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <MapPin className="w-4 h-4 text-primary" /> {selected.location}
                  </div>
                )}
                {selected.category && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Tag className="w-4 h-4 text-primary" /> {selected.category}
                  </div>
                )}
                {selected.description && <p className="text-sm pt-2">{selected.description}</p>}
              </DialogDescription>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Wrapper>
  );
};
