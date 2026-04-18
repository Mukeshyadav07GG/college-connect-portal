import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cpu, Briefcase, Code2, Clock, BookOpen, IndianRupee, ChevronRight } from "lucide-react";
import { BTECH_BRANCHES, OTHER_COURSES, Branch } from "@/data/courses";

const COURSES = [
  { code: "btech", icon: Cpu, title: "B.Tech", subtitle: "Bachelor of Technology", desc: "4-year engineering program across 6 specialisations.", gradient: "from-blue-500 to-purple-500" },
  { code: "bba", icon: Briefcase, title: "BBA", subtitle: "Business Administration", desc: "3-year management program with industry exposure.", gradient: "from-purple-500 to-pink-500" },
  { code: "bca", icon: Code2, title: "BCA", subtitle: "Computer Applications", desc: "3-year IT-focused undergraduate program.", gradient: "from-blue-600 to-indigo-500" },
];

export const Courses = () => {
  const [open, setOpen] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch>(BTECH_BRANCHES[0]);

  const openCourse = (code: string) => {
    setOpen(code);
    if (code === "btech") setSelectedBranch(BTECH_BRANCHES[0]);
    else if (code === "bba") setSelectedBranch(OTHER_COURSES[0]);
    else if (code === "bca") setSelectedBranch(OTHER_COURSES[1]);
  };

  return (
    <section id="courses" className="py-24 relative">
      <div className="container">
        <div className="text-center mb-14">
          <div className="inline-block glass px-4 py-1 rounded-full text-xs font-medium text-primary mb-4">PROGRAMS</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Explore our <span className="gradient-text">courses</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Click any course to discover branches, semesters, subjects and fee structure.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {COURSES.map((c, i) => (
            <button
              key={c.code}
              onClick={() => openCourse(c.code)}
              className="glass rounded-3xl p-8 text-left hover-lift hover-glow group animate-slide-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-glow`}>
                <c.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-1">{c.title}</h3>
              <div className="text-sm text-primary font-medium mb-3">{c.subtitle}</div>
              <p className="text-sm text-muted-foreground mb-5">{c.desc}</p>
              <div className="flex items-center text-sm font-semibold text-primary group-hover:gap-2 transition-all gap-1">
                View details <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* B.Tech Modal — branch selector */}
      <Dialog open={open === "btech"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="glass-strong max-w-4xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">B.Tech Branches</DialogTitle>
          <div className="bg-gradient-hero p-5 text-primary-foreground">
            <h3 className="font-display text-2xl font-bold">B.Tech — Choose your branch</h3>
            <p className="text-sm text-primary-foreground/90">6 industry-aligned specialisations</p>
          </div>
          <div className="grid md:grid-cols-[200px_1fr] max-h-[70vh]">
            <div className="border-r border-border p-3 space-y-1 overflow-y-auto bg-muted/30">
              {BTECH_BRANCHES.map((b) => (
                <button
                  key={b.code}
                  onClick={() => setSelectedBranch(b)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    selectedBranch.code === b.code
                      ? "gradient-bg text-primary-foreground shadow-glow"
                      : "hover:bg-primary/10"
                  }`}
                >
                  {b.code}
                </button>
              ))}
            </div>
            <BranchDetail key={selectedBranch.code} branch={selectedBranch} />
          </div>
        </DialogContent>
      </Dialog>

      {/* BBA / BCA modals */}
      {(["bba", "bca"] as const).map((c) => {
        const branch = c === "bba" ? OTHER_COURSES[0] : OTHER_COURSES[1];
        return (
          <Dialog key={c} open={open === c} onOpenChange={(v) => !v && setOpen(null)}>
            <DialogContent className="glass-strong max-w-2xl p-0 overflow-hidden">
              <DialogTitle className="sr-only">{branch.name}</DialogTitle>
              <div className="bg-gradient-hero p-5 text-primary-foreground">
                <h3 className="font-display text-2xl font-bold">{branch.name}</h3>
                <p className="text-sm text-primary-foreground/90">{branch.code}</p>
              </div>
              <BranchDetail branch={branch} />
            </DialogContent>
          </Dialog>
        );
      })}
    </section>
  );
};

const BranchDetail = ({ branch }: { branch: Branch }) => {
  return (
    <div className="p-6 overflow-y-auto animate-fade-in">
      <h4 className="font-display text-xl font-bold mb-1">{branch.name}</h4>
      <p className="text-sm text-muted-foreground mb-5">{branch.description}</p>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat icon={Clock} label="Duration" value={branch.duration} />
        <Stat icon={BookOpen} label="Semesters" value={String(branch.semesters)} />
        <Stat icon={IndianRupee} label="Fees" value={branch.fees.replace("₹", "")} prefix="₹" />
      </div>

      <h5 className="text-sm font-semibold mb-2 text-primary">Core subjects</h5>
      <div className="flex flex-wrap gap-2 mb-5">
        {branch.subjects.map((s) => (
          <span key={s} className="text-xs px-3 py-1 rounded-full bg-primary/10 text-foreground border border-primary/20">
            {s}
          </span>
        ))}
      </div>

      <Button className="glow-button w-full">Apply for Admission</Button>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value, prefix }: any) => (
  <div className="glass rounded-xl p-3 text-center">
    <Icon className="w-4 h-4 mx-auto text-primary mb-1" />
    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    <div className="font-display font-bold text-sm mt-0.5">{prefix}{value}</div>
  </div>
);
