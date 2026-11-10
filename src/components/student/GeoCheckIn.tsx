import { MapPin } from "lucide-react";
import { toast } from "sonner";

export const GeoCheckIn = () => {
  const explainDisabledCheckIn = () => {
    toast.info("Attendance is recorded by faculty. Browser location cannot securely verify your physical location.");
  };

  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
      <MapPin className="w-5 h-5 text-primary shrink-0" />
      <div>
        <div className="font-semibold text-sm">Campus Attendance</div>
        <div className="text-xs text-muted-foreground">
          Attendance is recorded by faculty. A browser location cannot securely confirm your physical location.
        </div>
        <button type="button" className="sr-only" onClick={explainDisabledCheckIn} tabIndex={-1} aria-hidden="true">
          GPS check-in unavailable
        </button>
      </div>
    </div>
  );
};