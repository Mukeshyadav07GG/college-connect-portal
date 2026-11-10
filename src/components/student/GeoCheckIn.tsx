import { MapPin } from "lucide-react";

export const GeoCheckIn = () => (
  <div className="glass rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
    <MapPin className="w-5 h-5 text-primary shrink-0" />
    <div>
      <div className="font-semibold text-sm">Campus Attendance</div>
      <div className="text-xs text-muted-foreground">
        Attendance is recorded by faculty. A browser location cannot securely confirm your physical location.
      </div>
    </div>
  </div>
);