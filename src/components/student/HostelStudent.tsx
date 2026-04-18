import { Hostel as HostelSection } from "@/components/sections/Hostel";

export const HostelStudent = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold mb-1">Hostel</h1>
        <p className="text-muted-foreground text-sm">Residential facilities and gallery.</p>
      </div>
      <HostelSection />
    </div>
  );
};
