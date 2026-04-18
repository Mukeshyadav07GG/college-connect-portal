import { AcademicCalendar } from "@/components/sections/AcademicCalendar";

export const Events = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold mb-1">Events</h1>
        <p className="text-muted-foreground text-sm">Click any event for full details.</p>
      </div>
      <AcademicCalendar embedded />
    </div>
  );
};
