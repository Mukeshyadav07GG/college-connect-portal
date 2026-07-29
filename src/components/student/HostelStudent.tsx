import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/api/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  GraduationCap,
  BedDouble,
  ShieldCheck,
  Siren,
  Mail,
  Phone,
  Hash,
  User,
  BookOpen,
  Building2,
  Snowflake,
  Wifi,
  Layers,
  Users,
  ChevronRight,
  Info,
} from "lucide-react";

interface Allocation {
  id: string;
  hostel_name: string;
  hostel_type: "Boys" | "Girls";
  room_no: string;
  sharing: number;
  floor: string | null;
  ac_type: "AC" | "Non-AC";
  wifi: boolean;
}

type CardKey = "student" | "hostel" | "authorities" | "emergency";

// Institution-configured contacts (read-only, managed by Admin ERP)
const AUTHORITIES = {
  warden: { name: "Dr. Rajeev Sharma", phone: "+91 98765 43210", email: "warden@knmiet.ac.in" },
  supervisor: { name: "Mr. Anil Verma", phone: "+91 98765 43211", email: "hostel.supervisor@knmiet.ac.in" },
};
const EMERGENCY = {
  medical: { phone: "+91 98765 43222", email: "medical@knmiet.ac.in" },
  management: { phone: "+91 98765 43233", email: "hostel.office@knmiet.ac.in" },
};

export const HostelStudent = () => {
  const { profile, user } = useAuth();
  const [alloc, setAlloc] = useState<Allocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<CardKey | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("hostel_allocations" as any)
        .select("id, hostel_name, hostel_type, room_no, sharing, floor, ac_type, wifi")
        .eq("student_id", user.id)
        .maybeSingle();
      setAlloc((data as any) ?? null);
      setLoading(false);
    })();
  }, [user]);

  const session = useMemo(() => {
    const y = new Date().getFullYear();
    return `${y}–${y + 1}`;
  }, []);

  const cards: {
    key: CardKey;
    title: string;
    desc: string;
    icon: typeof User;
    gradient: string;
    ring: string;
  }[] = [
    {
      key: "student",
      title: "Student Information",
      desc: "View your academic information.",
      icon: GraduationCap,
      gradient: "from-blue-500/90 via-indigo-500/90 to-violet-500/90",
      ring: "shadow-[0_20px_60px_-20px_hsl(230_85%_55%/0.55)]",
    },
    {
      key: "hostel",
      title: "Hostel Information",
      desc: "View your allocated hostel details.",
      icon: BedDouble,
      gradient: "from-fuchsia-500/90 via-purple-500/90 to-indigo-500/90",
      ring: "shadow-[0_20px_60px_-20px_hsl(280_85%_60%/0.55)]",
    },
    {
      key: "authorities",
      title: "Hostel Authorities",
      desc: "Contact hostel administration.",
      icon: ShieldCheck,
      gradient: "from-emerald-500/90 via-teal-500/90 to-cyan-500/90",
      ring: "shadow-[0_20px_60px_-20px_hsl(170_80%_45%/0.55)]",
    },
    {
      key: "emergency",
      title: "Emergency Contacts",
      desc: "Medical & management contacts.",
      icon: Siren,
      gradient: "from-rose-500/90 via-red-500/90 to-orange-500/90",
      ring: "shadow-[0_20px_60px_-20px_hsl(0_85%_60%/0.55)]",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto animate-page-enter">
      {/* Header */}
      <header className="mb-10">
        <div className="inline-flex items-center gap-2 glass px-3 py-1 rounded-full text-[11px] font-medium text-primary mb-4">
          <Building2 className="w-3.5 h-3.5" />
          RESIDENTIAL LIFE · READ ONLY
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-2">
          Hostel
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl">
          View your hostel information assigned by the administration.
        </p>
      </header>

      {/* Floating cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c, i) => (
          <button
            key={c.key}
            onClick={() => setOpen(c.key)}
            aria-label={`Open ${c.title}`}
            className={`group relative text-left glass rounded-[22px] p-6 overflow-hidden animate-slide-up hover-lift focus-visible:ring-2 focus-visible:ring-primary/50 ${c.ring}`}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            {/* Floating glow blob */}
            <div
              className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${c.gradient} opacity-30 blur-2xl group-hover:opacity-60 transition-opacity duration-500`}
            />
            <div
              className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white shadow-lg mb-5 animate-float`}
              style={{ animationDelay: `${i * 200}ms` }}
            >
              <c.icon className="w-6 h-6" strokeWidth={2.2} />
            </div>
            <h3 className="font-display font-bold text-lg mb-1.5">{c.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
            <div className="mt-5 flex items-center gap-1 text-xs font-medium text-primary opacity-70 group-hover:opacity-100 group-hover:gap-2 transition-all">
              View details <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>
        ))}
      </div>

      {/* Modals */}
      <Dialog open={open === "student"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="glass-strong rounded-[24px] max-w-lg border-white/10">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white shadow-lg mb-3">
              <GraduationCap className="w-5 h-5" />
            </div>
            <DialogTitle className="font-display text-2xl">Student Information</DialogTitle>
            <DialogDescription>Read-only academic profile.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 mt-2">
            <InfoRow icon={User} label="Student Name" value={profile?.full_name ?? "—"} />
            <InfoRow icon={Hash} label="Enrollment Number" value={profile?.roll_number ?? "—"} />
            <InfoRow icon={BookOpen} label="Course" value={profile?.course ?? "B.Tech"} />
            <InfoRow icon={GraduationCap} label="Branch" value={profile?.branch ?? "—"} />
            <InfoRow icon={Layers} label="Academic Session" value={session} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "hostel"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="glass-strong rounded-[24px] max-w-lg border-white/10">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-indigo-500 flex items-center justify-center text-white shadow-lg mb-3">
              <BedDouble className="w-5 h-5" />
            </div>
            <DialogTitle className="font-display text-2xl">Hostel Information</DialogTitle>
            <DialogDescription>Assigned by administration. Read-only.</DialogDescription>
          </DialogHeader>
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
          ) : !alloc ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center">
              <Info className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm font-medium">No hostel allocated yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Contact the hostel office if you believe this is a mistake.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 mt-2">
              <InfoRow icon={Building2} label="Hostel Name" value={alloc.hostel_name} />
              <InfoRow icon={Hash} label="Room Number" value={alloc.room_no} />
              <InfoRow icon={Snowflake} label="Room Type" value={alloc.ac_type} />
              {alloc.floor && <InfoRow icon={Layers} label="Floor" value={alloc.floor} />}
              <InfoRow icon={Users} label="Sharing" value={`${alloc.sharing}-sharing`} />
              <InfoRow icon={Wifi} label="Wi-Fi" value={alloc.wifi ? "Available" : "Not Available"} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={open === "authorities"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="glass-strong rounded-[24px] max-w-lg border-white/10">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-lg mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <DialogTitle className="font-display text-2xl">Hostel Authorities</DialogTitle>
            <DialogDescription>Reach out to hostel administration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <ContactBlock role="Warden" {...AUTHORITIES.warden} />
            <ContactBlock role="Supervisor" {...AUTHORITIES.supervisor} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "emergency"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="glass-strong rounded-[24px] max-w-lg border-white/10">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white shadow-lg mb-3">
              <Siren className="w-5 h-5" />
            </div>
            <DialogTitle className="font-display text-2xl">Emergency Contacts</DialogTitle>
            <DialogDescription>Use in case of medical or urgent needs.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <ContactBlock role="Medical Contact" phone={EMERGENCY.medical.phone} email={EMERGENCY.medical.email} />
            <ContactBlock role="Hostel Management" phone={EMERGENCY.management.phone} email={EMERGENCY.management.email} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) => (
  <div className="flex items-center gap-3 rounded-2xl p-3.5 bg-muted/40 border border-border/50">
    <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground flex-shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className="text-sm font-semibold truncate">{value}</div>
    </div>
  </div>
);

const ContactBlock = ({
  role,
  name,
  phone,
  email,
}: {
  role: string;
  name?: string;
  phone: string;
  email: string;
}) => (
  <div className="rounded-2xl p-4 bg-muted/40 border border-border/50">
    <div className="flex items-center justify-between mb-3">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{role}</div>
        {name && <div className="font-display font-bold text-base mt-0.5">{name}</div>}
      </div>
    </div>
    <div className="grid gap-2">
      <a
        href={`tel:${phone.replace(/\s/g, "")}`}
        aria-label={`Call ${role}`}
        className="flex items-center gap-3 rounded-xl p-2.5 bg-background/60 hover:bg-background transition-colors group"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white">
          <Phone className="w-3.5 h-3.5" />
        </div>
        <span className="text-sm font-medium group-hover:text-primary transition-colors">{phone}</span>
      </a>
      <a
        href={`mailto:${email}`}
        aria-label={`Email ${role}`}
        className="flex items-center gap-3 rounded-xl p-2.5 bg-background/60 hover:bg-background transition-colors group"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white">
          <Mail className="w-3.5 h-3.5" />
        </div>
        <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">{email}</span>
      </a>
    </div>
  </div>
);
