import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { subjectSem } from "@/lib/semesters";

export const GeoCheckIn = ({ onMarked }: { onMarked?: () => void }) => {
  const [subjects, setSubjects] = useState<{ code: string; name: string }[]>([]);
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);

  const { profile } = useAuth();
  const sem = profile?.semester ?? null;

  useEffect(() => {
    supabase.from("subjects").select("code, name, semester").order("code").then(({ data }) =>
      setSubjects((data ?? []).filter((s) => !sem || subjectSem(s) === sem)));
  }, [sem]);

  const checkIn = () => {
    if (!subject) { toast.error("Pick a subject"); return; }
    if (!("geolocation" in navigator)) { toast.error("Location is not supported on this device"); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { data, error } = await supabase.rpc("geo_check_in", {
          _subject_code: subject, _lat: pos.coords.latitude, _lng: pos.coords.longitude,
          _accuracy: pos.coords.accuracy,
        });
        setBusy(false);
        if (error) { toast.error(error.message); return; }
        const r = Array.isArray(data) ? data[0] : data;
        const dist = Math.round(r?.distance_meters ?? 0);
        if (r?.status === "verified") { toast.success(`Attendance marked ✅ (${dist} m from campus)`); onMarked?.(); }
        else if (r?.status === "already_marked") toast.info("Attendance already marked for today");
        else toast.error(`You are outside campus boundary ❌ (${dist} m away, allowed ${r?.radius_meters} m)`);
      },
      (err) => { setBusy(false); toast.error(err.code === 1 ? "Please allow location access" : "Could not get your location"); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  return (
    <div className="glass rounded-2xl p-4 flex flex-wrap items-center gap-3 animate-fade-in">
      <div className="flex items-center gap-2 mr-auto">
        <MapPin className="w-5 h-5 text-primary" />
        <div>
          <div className="font-semibold text-sm">Campus GPS Check-in</div>
          <div className="text-xs text-muted-foreground">Mark today's attendance from inside campus</div>
        </div>
      </div>
      <Select value={subject} onValueChange={setSubject}>
        <SelectTrigger className="w-56"><SelectValue placeholder="Select subject" /></SelectTrigger>
        <SelectContent>
          {subjects.map((s) => <SelectItem key={s.code} value={s.code}>{s.code} – {s.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button onClick={checkIn} disabled={busy}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
        Mark Attendance
      </Button>
    </div>
  );
};
